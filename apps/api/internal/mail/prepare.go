package mail

import "regexp"

// PrepareEmailHTML transforms editor HTML into email-safe HTML.
//   - Converts YouTube iframes to clickable thumbnail images
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

	// Strip editor-only CSS classes (class="...") since email clients ignore them
	classRe := regexp.MustCompile(` class="[^"]*"`)
	html = classRe.ReplaceAllString(html, "")

	return html
}
