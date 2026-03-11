package handlers

import (
	"encoding/base64"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
)

type GuideHandler struct {
	db *gorm.DB
}

func NewGuideHandler(db *gorm.DB) *GuideHandler {
	return &GuideHandler{db: db}
}

// ===================== ADMIN CRUD =====================

func (h *GuideHandler) ListGuides(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	var total int64
	h.db.Model(&models.PremiumGuide{}).Count(&total)

	var guides []models.PremiumGuide
	if err := h.db.Preload("EmailList").Order("sort_order ASC, created_at DESC").
		Offset(offset).Limit(pageSize).Find(&guides).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list guides"})
		return
	}

	for i := range guides {
		h.db.Model(&models.GuideDownload{}).Where("guide_id = ?", guides[i].ID).Count(&guides[i].DownloadCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": guides,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *GuideHandler) GetGuide(c *gin.Context) {
	id := c.Param("id")
	var guide models.PremiumGuide
	if err := h.db.Preload("EmailList").First(&guide, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guide not found"})
		return
	}
	h.db.Model(&models.GuideDownload{}).Where("guide_id = ?", guide.ID).Count(&guide.DownloadCount)
	c.JSON(http.StatusOK, gin.H{"data": guide})
}

func (h *GuideHandler) CreateGuide(c *gin.Context) {
	var guide models.PremiumGuide
	if err := c.ShouldBindJSON(&guide); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	guide.TenantID = 1
	if guide.Slug == "" {
		guide.Slug = generateGuideSlug(guide.Title)
	}
	if guide.Status == "" {
		guide.Status = models.GuideStatusDraft
	}
	if err := h.db.Create(&guide).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create guide"})
		return
	}
	h.db.Preload("EmailList").First(&guide, guide.ID)
	c.JSON(http.StatusCreated, gin.H{"data": guide})
}

func (h *GuideHandler) UpdateGuide(c *gin.Context) {
	id := c.Param("id")
	var guide models.PremiumGuide
	if err := h.db.First(&guide, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guide not found"})
		return
	}
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)
	if err := h.db.Model(&guide).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update guide"})
		return
	}
	h.db.Preload("EmailList").First(&guide, id)
	h.db.Model(&models.GuideDownload{}).Where("guide_id = ?", guide.ID).Count(&guide.DownloadCount)
	c.JSON(http.StatusOK, gin.H{"data": guide})
}

func (h *GuideHandler) DeleteGuide(c *gin.Context) {
	id := c.Param("id")
	h.db.Delete(&models.PremiumGuide{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Guide deleted"})
}

// ===================== PUBLIC ENDPOINTS =====================

func (h *GuideHandler) ListPublicGuides(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	var total int64
	h.db.Model(&models.PremiumGuide{}).Where("status = ?", models.GuideStatusPublished).Count(&total)

	var guides []models.PremiumGuide
	if err := h.db.Where("status = ?", models.GuideStatusPublished).
		Order("sort_order ASC, created_at DESC").
		Offset(offset).Limit(pageSize).Find(&guides).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list guides"})
		return
	}

	// Strip pdf_url from public response
	type publicGuide struct {
		ID          uint   `json:"id"`
		Title       string `json:"title"`
		Slug        string `json:"slug"`
		Description string `json:"description"`
		CoverImage  string `json:"cover_image"`
		CreatedAt   string `json:"created_at"`
	}
	result := make([]publicGuide, len(guides))
	for i, g := range guides {
		result[i] = publicGuide{
			ID:          g.ID,
			Title:       g.Title,
			Slug:        g.Slug,
			Description: g.Description,
			CoverImage:  g.CoverImage,
			CreatedAt:   g.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *GuideHandler) GetPublicGuide(c *gin.Context) {
	slug := c.Param("slug")
	var guide models.PremiumGuide
	if err := h.db.Where("slug = ? AND status = ?", slug, models.GuideStatusPublished).First(&guide).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guide not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":          guide.ID,
			"title":       guide.Title,
			"slug":        guide.Slug,
			"description": guide.Description,
			"cover_image": guide.CoverImage,
			"created_at":  guide.CreatedAt,
		},
	})
}

func (h *GuideHandler) CheckGuideAccess(c *gin.Context) {
	slug := c.Param("slug")
	emailB64 := c.Query("e")
	if emailB64 == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email parameter required"})
		return
	}

	emailBytes, err := base64.URLEncoding.DecodeString(emailB64)
	if err != nil {
		// Try standard encoding as fallback
		emailBytes, err = base64.StdEncoding.DecodeString(emailB64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email parameter"})
			return
		}
	}
	email := string(emailBytes)

	var guide models.PremiumGuide
	if err := h.db.Preload("EmailList").Where("slug = ? AND status = ?", slug, models.GuideStatusPublished).First(&guide).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guide not found"})
		return
	}

	var hasAccess bool
	if guide.EmailListID != nil && *guide.EmailListID > 0 {
		hasAccess = h.checkSubscription(email, *guide.EmailListID)
	}

	resp := gin.H{
		"has_access": hasAccess,
		"list_name":  guide.EmailList.Name,
	}
	if hasAccess {
		resp["pdf_url"] = guide.PdfUrl
	}
	c.JSON(http.StatusOK, resp)
}

func (h *GuideHandler) DownloadGuide(c *gin.Context) {
	slug := c.Param("slug")
	emailB64 := c.Query("e")
	if emailB64 == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email parameter required"})
		return
	}

	emailBytes, err := base64.URLEncoding.DecodeString(emailB64)
	if err != nil {
		emailBytes, err = base64.StdEncoding.DecodeString(emailB64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email parameter"})
			return
		}
	}
	email := string(emailBytes)

	var guide models.PremiumGuide
	if err := h.db.Where("slug = ? AND status = ?", slug, models.GuideStatusPublished).First(&guide).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guide not found"})
		return
	}

	if guide.EmailListID == nil || !h.checkSubscription(email, *guide.EmailListID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Subscription required"})
		return
	}

	// Record download
	download := models.GuideDownload{
		GuideID:   guide.ID,
		Email:     email,
		IPAddress: c.ClientIP(),
	}
	h.db.Create(&download)

	c.Redirect(http.StatusFound, guide.PdfUrl)
}

// ===================== HELPERS =====================

func (h *GuideHandler) checkSubscription(email string, listID uint) bool {
	var count int64
	h.db.Model(&models.EmailSubscription{}).
		Joins("JOIN contacts ON contacts.id = email_subscriptions.contact_id").
		Where("contacts.email = ? AND email_subscriptions.email_list_id = ? AND email_subscriptions.status = ?",
			email, listID, models.SubStatusActive).
		Count(&count)
	return count > 0
}

func generateGuideSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == ' ' {
			return r
		}
		return -1
	}, slug)
	slug = strings.ReplaceAll(slug, " ", "-")
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	return strings.Trim(slug, "-")
}
