package mail

import (
	"regexp"
	"strings"
)

// PrepareEmailHTML transforms editor HTML into email-safe HTML.
//   - Converts YouTube iframes to clickable thumbnail images
//   - Converts CTA links (data-cta="true") to styled email buttons
//   - Strips editor-only CSS classes
func PrepareEmailHTML(html string) string {
	// Convert TipTap YouTube embeds:
	// <div data-youtube-video><iframe src="youtube.com/embed/ID..."></iframe></div>
	youtubeRe := regexp.MustCompile(`(?s)<div[^>]*data-youtube-video[^>]*>.*?<iframe[^>]*src=["']https?://(?:www\.)?youtube\.com/embed/([^?"']+)[^"']*["'][^>]*>.*?</iframe>.*?</div>`)
	html = youtubeRe.ReplaceAllStringFunc(html, func(match string) string {
		submatch := youtubeRe.FindStringSubmatch(match)
		if len(submatch) < 2 {
			return match
		}
		videoID := submatch[1]
		thumbURL := "https://img.youtube.com/vi/" + videoID + "/hqdefault.jpg"
		watchURL := "https://www.youtube.com/watch?v=" + videoID
		return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td align="center">` +
			`<a href="` + watchURL + `" target="_blank" style="display:inline-block;text-decoration:none;">` +
			`<img src="` + thumbURL + `" alt="&#9654; Watch on YouTube" width="480" style="max-width:100%;border-radius:8px;display:block;border:0;" />` +
			`<p style="margin:8px 0 0;font-size:14px;color:#ff0000;font-weight:600;">&#9654; Watch on YouTube</p>` +
			`</a></td></tr></table>`
	})

	// Convert CTA links (data-cta="true") to email-safe styled buttons
	// Match: <a ... data-cta="true" ...>text</a>
	ctaRe := regexp.MustCompile(`<a\s([^>]*?)data-cta="true"([^>]*?)>(.*?)</a>`)
	html = ctaRe.ReplaceAllStringFunc(html, func(match string) string {
		submatch := ctaRe.FindStringSubmatch(match)
		if len(submatch) < 4 {
			return match
		}
		// Extract href from the combined attributes
		attrs := submatch[1] + submatch[2]
		text := submatch[3]
		hrefRe := regexp.MustCompile(`href="([^"]*)"`)
		hrefMatch := hrefRe.FindStringSubmatch(attrs)
		href := "#"
		if len(hrefMatch) >= 2 {
			href = hrefMatch[1]
		}
		// Email-safe button using table
		return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td align="center">` +
			`<table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#6c5ce7" style="background-color:#6c5ce7;border-radius:8px;">` +
			`<a href="` + href + `" target="_blank" style="display:inline-block;padding:14px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">` +
			text + `</a>` +
			`</td></tr></table>` +
			`</td></tr></table>`
	})

	// Strip editor-only CSS classes (class="...") since email clients ignore them
	classRe := regexp.MustCompile(` class="[^"]*"`)
	html = classRe.ReplaceAllString(html, "")

	return html
}

// BuildSocialFooter generates an HTML footer with social media icon links.
func BuildSocialFooter(socials map[string]string) string {
	type social struct {
		key, label, icon string
	}
	// SVG icons as data URIs for maximum email client compatibility
	items := []social{
		{"social_youtube", "YouTube", `<img src="https://cdn.simpleicons.org/youtube/FF0000" alt="YouTube" width="24" height="24" style="display:block;border:0;" />`},
		{"social_github", "GitHub", `<img src="https://cdn.simpleicons.org/github/ffffff" alt="GitHub" width="24" height="24" style="display:block;border:0;" />`},
		{"social_linkedin", "LinkedIn", `<img src="https://cdn.simpleicons.org/linkedin/0A66C2" alt="LinkedIn" width="24" height="24" style="display:block;border:0;" />`},
		{"social_twitter", "X", `<img src="https://cdn.simpleicons.org/x/ffffff" alt="X" width="24" height="24" style="display:block;border:0;" />`},
		{"social_instagram", "Instagram", `<img src="https://cdn.simpleicons.org/instagram/E4405F" alt="Instagram" width="24" height="24" style="display:block;border:0;" />`},
	}

	var links []string
	for _, s := range items {
		url, ok := socials[s.key]
		if !ok || url == "" {
			continue
		}
		links = append(links, `<td style="padding:0 8px;"><a href="`+url+`" target="_blank" style="text-decoration:none;">`+s.icon+`</a></td>`)
	}
	if len(links) == 0 {
		return ""
	}

	return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;border-top:1px solid #e5e5e5;padding-top:24px;"><tr><td align="center">` +
		`<table cellpadding="0" cellspacing="0" border="0"><tr>` +
		strings.Join(links, "") +
		`</tr></table>` +
		`</td></tr></table>`
}
