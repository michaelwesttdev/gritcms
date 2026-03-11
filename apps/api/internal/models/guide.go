package models

import (
	"time"

	"gorm.io/gorm"
)

// --- Premium Guides ---

const (
	GuideStatusDraft     = "draft"
	GuideStatusPublished = "published"
)

type PremiumGuide struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Title       string         `gorm:"size:500;not null" json:"title"`
	Slug        string         `gorm:"size:255;uniqueIndex:idx_guide_slug_tenant;not null" json:"slug"`
	Description string         `gorm:"type:text" json:"description"`
	CoverImage  string         `gorm:"size:500" json:"cover_image"`
	PdfUrl      string         `gorm:"size:500" json:"pdf_url"`
	EmailListID *uint          `gorm:"index" json:"email_list_id"`
	Status      string         `gorm:"size:20;default:'draft';index" json:"status"`
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	EmailList     EmailList `gorm:"foreignKey:EmailListID" json:"email_list,omitempty"`
	DownloadCount int64     `gorm:"-" json:"download_count"`
}

// --- Guide Downloads (tracking) ---

type GuideDownload struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	GuideID   uint      `gorm:"index;not null" json:"guide_id"`
	Email     string    `gorm:"size:255;not null" json:"email"`
	IPAddress string    `gorm:"size:45" json:"ip_address"`
	CreatedAt time.Time `json:"created_at"`
}
