package jobs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/cache"
	"gritcms/apps/api/internal/mail"
	"gritcms/apps/api/internal/models"
	"gritcms/apps/api/internal/storage"
)

// WorkerDeps holds dependencies needed by job handlers.
type WorkerDeps struct {
	DB      *gorm.DB
	Mailer  *mail.Mailer
	Storage *storage.Storage
	Cache   *cache.Cache
	Jobs    *Client
	AppURL  string // Base API URL for generating links (e.g. unsubscribe URLs)
}

// StartWorker starts the asynq worker server in a goroutine.
// Returns a stop function and any startup error.
func StartWorker(redisURL string, deps WorkerDeps) (func(), error) {
	redisOpt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis URL for worker: %w", err)
	}

	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: 10,
		Queues: map[string]int{
			"default":  6,
			"critical": 3,
			"low":      1,
		},
	})

	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeEmailSend, handleEmailSend(deps))
	mux.HandleFunc(TypeImageProcess, handleImageProcess(deps))
	mux.HandleFunc(TypeTokensCleanup, handleTokensCleanup(deps))
	mux.HandleFunc(TypeCampaignProcess, handleCampaignProcess(deps))
	mux.HandleFunc(TypeCampaignCheckScheduled, handleCampaignCheckScheduled(deps))

	go func() {
		if err := srv.Run(mux); err != nil {
			log.Printf("Worker error: %v", err)
		}
	}()

	return func() {
		srv.Shutdown()
	}, nil
}

func handleEmailSend(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.Mailer == nil {
			return fmt.Errorf("mailer not configured")
		}

		var payload EmailPayload
		if err := json.Unmarshal(task.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshaling email payload: %w", err)
		}

		log.Printf("Sending email to %s: %s", payload.To, payload.Subject)

		return deps.Mailer.Send(ctx, mail.SendOptions{
			To:       payload.To,
			Subject:  payload.Subject,
			Template: payload.Template,
			Data:     payload.Data,
		})
	}
}

func handleImageProcess(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.Storage == nil {
			return fmt.Errorf("storage not configured")
		}

		var payload ImagePayload
		if err := json.Unmarshal(task.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshaling image payload: %w", err)
		}

		log.Printf("Processing image: upload %d, key %s", payload.UploadID, payload.Key)

		// Download the original image
		reader, err := deps.Storage.Download(ctx, payload.Key)
		if err != nil {
			return fmt.Errorf("downloading image: %w", err)
		}
		defer reader.Close()

		// Generate thumbnail
		thumbBytes, err := storage.GenerateThumbnail(reader, payload.MimeType)
		if err != nil {
			return fmt.Errorf("generating thumbnail: %w", err)
		}

		// Upload thumbnail
		thumbKey := strings.Replace(payload.Key, "uploads/", "thumbnails/", 1)
		if err := deps.Storage.Upload(ctx, thumbKey, bytes.NewReader(thumbBytes), payload.MimeType); err != nil {
			return fmt.Errorf("uploading thumbnail: %w", err)
		}

		// Update the upload record with thumbnail URL
		thumbURL := deps.Storage.GetURL(thumbKey)
		if deps.DB != nil {
			deps.DB.Model(&models.Upload{}).Where("id = ?", payload.UploadID).Update("thumbnail_url", thumbURL)
		}

		log.Printf("Thumbnail created for upload %d", payload.UploadID)
		return nil
	}
}

func handleTokensCleanup(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.DB == nil {
			return fmt.Errorf("database not configured")
		}

		log.Println("Running token cleanup...")

		// Clean up soft-deleted records older than 30 days
		result := deps.DB.Exec("DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'")
		if result.Error != nil {
			return fmt.Errorf("cleaning up deleted users: %w", result.Error)
		}

		log.Printf("Token cleanup complete, removed %d records", result.RowsAffected)
		return nil
	}
}

func handleCampaignProcess(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.DB == nil || deps.Mailer == nil {
			return fmt.Errorf("database or mailer not configured")
		}

		var payload CampaignPayload
		if err := json.Unmarshal(task.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshaling campaign payload: %w", err)
		}

		log.Printf("Processing campaign %d", payload.CampaignID)

		// Load campaign with template
		var campaign models.EmailCampaign
		if err := deps.DB.Preload("Template").First(&campaign, payload.CampaignID).Error; err != nil {
			return fmt.Errorf("loading campaign %d: %w", payload.CampaignID, err)
		}

		// Skip if already sent or cancelled
		if campaign.Status == models.CampaignStatusSent || campaign.Status == models.CampaignStatusCancelled {
			log.Printf("Campaign %d already %s, skipping", payload.CampaignID, campaign.Status)
			return nil
		}

		// Update status to sending
		deps.DB.Model(&campaign).Updates(map[string]interface{}{
			"status": models.CampaignStatusSending,
			"sent_at": time.Now(),
		})

		// Resolve HTML content
		htmlContent := campaign.HTMLContent
		subject := campaign.Subject
		if subject == "" && campaign.Template != nil {
			subject = campaign.Template.Subject
		}

		// If a template is selected, use it as a layout wrapper and substitute placeholders
		if campaign.Template != nil && campaign.Template.HTMLContent != "" {
			tmpl := campaign.Template.HTMLContent
			tmpl = strings.ReplaceAll(tmpl, "{{subject}}", subject)
			tmpl = strings.ReplaceAll(tmpl, "{{content}}", htmlContent)
			htmlContent = tmpl
		}
		if htmlContent == "" {
			deps.DB.Model(&campaign).Update("status", models.CampaignStatusSent)
			log.Printf("Campaign %d has no HTML content, marked as sent", payload.CampaignID)
			return nil
		}

		// Load social settings for email footer
		var socialSettings []models.Setting
		deps.DB.Where("`group` = ? AND `key` LIKE ?", "theme", "social_%").Find(&socialSettings)
		socials := map[string]string{}
		for _, s := range socialSettings {
			socials[s.Key] = s.Value
		}
		socialFooter := mail.BuildSocialFooter(socials)
		if socialFooter != "" {
			htmlContent += socialFooter
		}

		// Build "from" string
		from := ""
		if campaign.FromName != "" && campaign.FromEmail != "" {
			from = fmt.Sprintf("%s <%s>", campaign.FromName, campaign.FromEmail)
		} else if campaign.FromEmail != "" {
			from = campaign.FromEmail
		}

		// Collect unique recipient contact IDs
		recipientIDs := map[uint]bool{}

		// From email lists
		var listIDs []uint
		if campaign.ListIDs != nil {
			_ = json.Unmarshal(campaign.ListIDs, &listIDs)
		}
		if len(listIDs) > 0 {
			var subs []models.EmailSubscription
			deps.DB.Where("email_list_id IN ? AND status = ?", listIDs, models.SubStatusActive).Find(&subs)
			for _, sub := range subs {
				recipientIDs[sub.ContactID] = true
			}
		}

		// From tags
		var tagIDs []uint
		if campaign.TagIDs != nil {
			_ = json.Unmarshal(campaign.TagIDs, &tagIDs)
		}
		if len(tagIDs) > 0 {
			var contactIDs []uint
			deps.DB.Raw("SELECT DISTINCT contact_id FROM contact_tags WHERE tag_id IN ?", tagIDs).Scan(&contactIDs)
			for _, cid := range contactIDs {
				recipientIDs[cid] = true
			}
		}

		// From segments
		var segmentIDs []uint
		if campaign.SegmentIDs != nil {
			_ = json.Unmarshal(campaign.SegmentIDs, &segmentIDs)
		}
		if len(segmentIDs) > 0 {
			for _, segID := range segmentIDs {
				var seg models.Segment
				if err := deps.DB.First(&seg, segID).Error; err != nil {
					continue
				}
				contactIDs := resolveSegmentContacts(deps.DB, seg)
				for _, cid := range contactIDs {
					recipientIDs[cid] = true
				}
			}
		}

		if len(recipientIDs) == 0 {
			deps.DB.Model(&campaign).Update("status", models.CampaignStatusSent)
			log.Printf("Campaign %d has no recipients, marked as sent", payload.CampaignID)
			return nil
		}

		// Load contacts
		ids := make([]uint, 0, len(recipientIDs))
		for id := range recipientIDs {
			ids = append(ids, id)
		}
		var contacts []models.Contact
		deps.DB.Where("id IN ?", ids).Find(&contacts)

		// Build contact → unsubscribe token map from subscriptions
		contactUnsubToken := map[uint]string{}
		if len(listIDs) > 0 {
			var allSubs []models.EmailSubscription
			deps.DB.Where("email_list_id IN ? AND status = ?", listIDs, models.SubStatusActive).Find(&allSubs)
			for _, sub := range allSubs {
				if sub.ConfirmToken != "" {
					contactUnsubToken[sub.ContactID] = sub.ConfirmToken
				}
			}
		}

		// Send to each contact
		sentCount := 0
		failedCount := 0
		for _, contact := range contacts {
			if contact.Email == "" {
				continue
			}

			// Build per-recipient HTML with unsubscribe URL
			recipientHTML := htmlContent
			if token, ok := contactUnsubToken[contact.ID]; ok && deps.AppURL != "" {
				unsubURL := strings.TrimRight(deps.AppURL, "/") + "/api/email/unsubscribe/" + token
				recipientHTML = strings.ReplaceAll(recipientHTML, "{{unsubscribe_url}}", unsubURL)
			}
			// Remove any remaining unsubscribe placeholders for non-list recipients
			recipientHTML = strings.ReplaceAll(recipientHTML, "{{unsubscribe_url}}", "#")

			// Transform editor HTML to email-safe HTML (YouTube iframes → thumbnails, strip classes)
			recipientHTML = mail.PrepareEmailHTML(recipientHTML)

			// Create EmailSend record
			now := time.Now()
			send := models.EmailSend{
				TenantID:   1,
				ContactID:  contact.ID,
				CampaignID: &campaign.ID,
				Subject:    subject,
				Status:     models.SendStatusQueued,
				SentAt:     &now,
			}
			deps.DB.Create(&send)

			// Send the email
			messageID, err := deps.Mailer.SendCampaignEmail(ctx, mail.CampaignEmailOptions{
				From:     from,
				ReplyTo:  campaign.ReplyTo,
				To:       contact.Email,
				Subject:  subject,
				HTMLBody: recipientHTML,
			})

			if err != nil {
				log.Printf("Campaign %d: failed to send to %s: %v", payload.CampaignID, contact.Email, err)
				deps.DB.Model(&send).Updates(map[string]interface{}{
					"status": models.SendStatusFailed,
				})
				failedCount++
				continue
			}

			deps.DB.Model(&send).Updates(map[string]interface{}{
				"status":      models.SendStatusSent,
				"external_id": messageID,
			})
			sentCount++
		}

		// Update campaign stats and status
		stats := models.CampaignStats{
			Sent:    sentCount,
			Bounced: failedCount,
		}
		statsJSON, _ := json.Marshal(stats)
		deps.DB.Model(&campaign).Updates(map[string]interface{}{
			"status": models.CampaignStatusSent,
			"stats":  statsJSON,
		})

		log.Printf("Campaign %d complete: %d sent, %d failed", payload.CampaignID, sentCount, failedCount)
		return nil
	}
}

// resolveSegmentContacts returns contact IDs matching a segment's rules.
func resolveSegmentContacts(db *gorm.DB, seg models.Segment) []uint {
	q := db.Model(&models.Contact{}).Select("id").Where("tenant_id = ?", 1)

	if seg.Rules == nil {
		return nil
	}

	var ruleGroup models.SegmentRuleGroup
	if err := json.Unmarshal(seg.Rules, &ruleGroup); err != nil {
		return nil
	}

	for _, rule := range ruleGroup.Rules {
		switch rule.Field {
		case "email":
			switch rule.Operator {
			case "contains":
				q = q.Where("email ILIKE ?", "%"+rule.Value+"%")
			case "equals":
				q = q.Where("email = ?", rule.Value)
			case "ends_with":
				q = q.Where("email ILIKE ?", "%"+rule.Value)
			}
		case "first_name", "last_name":
			switch rule.Operator {
			case "contains":
				q = q.Where(fmt.Sprintf("%s ILIKE ?", rule.Field), "%"+rule.Value+"%")
			case "equals":
				q = q.Where(fmt.Sprintf("%s = ?", rule.Field), rule.Value)
			}
		case "source":
			q = q.Where("source = ?", rule.Value)
		case "country":
			q = q.Where("country = ?", rule.Value)
		case "tag":
			switch rule.Operator {
			case "has_tag":
				q = q.Where("id IN (SELECT contact_id FROM contact_tags ct JOIN tags t ON t.id = ct.tag_id WHERE t.name = ?)", rule.Value)
			case "has_no_tag":
				q = q.Where("id NOT IN (SELECT contact_id FROM contact_tags ct JOIN tags t ON t.id = ct.tag_id WHERE t.name = ?)", rule.Value)
			}
		case "subscribed_to_list":
			q = q.Where("id IN (SELECT contact_id FROM email_subscriptions WHERE email_list_id = ? AND status = 'active')", rule.Value)
		case "created_after":
			q = q.Where("created_at >= ?", rule.Value)
		case "created_before":
			q = q.Where("created_at <= ?", rule.Value)
		}
	}

	var contactIDs []uint
	q.Pluck("id", &contactIDs)
	return contactIDs
}

func handleCampaignCheckScheduled(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.DB == nil {
			return fmt.Errorf("database not configured")
		}

		// Find campaigns that are scheduled and due
		var campaigns []models.EmailCampaign
		deps.DB.Where("status = ? AND scheduled_at <= ?", models.CampaignStatusScheduled, time.Now()).Find(&campaigns)

		if len(campaigns) == 0 {
			return nil
		}

		log.Printf("Found %d scheduled campaigns to process", len(campaigns))

		for _, campaign := range campaigns {
			// Mark as sending so it won't be picked up again
			deps.DB.Model(&campaign).Updates(map[string]interface{}{
				"status": models.CampaignStatusSending,
				"sent_at": time.Now(),
			})

			if deps.Jobs != nil {
				if err := deps.Jobs.EnqueueCampaignProcess(campaign.ID); err != nil {
					log.Printf("Failed to enqueue campaign %d: %v", campaign.ID, err)
				}
			}
		}

		return nil
	}
}
