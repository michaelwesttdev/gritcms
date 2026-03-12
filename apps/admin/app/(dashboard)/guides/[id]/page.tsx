"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useGuide, useUpdateGuide, useDeleteGuide, useGuideReferrals } from "@/hooks/use-guides";
import { useEmailLists } from "@/hooks/use-email";
import { uploadFile } from "@/lib/api-client";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Upload,
  FileText,
  Download,
  Image as ImageIcon,
  Copy,
  Check,
  ExternalLink,
  BarChart3,
} from "@/lib/icons";
import { useConfirm } from "@/hooks/use-confirm";

export default function GuideEditPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const id = Number(params.id);

  const { data: guide, isLoading } = useGuide(id);
  const { data: emailLists } = useEmailLists();
  const { mutate: updateGuide, isPending: saving } = useUpdateGuide();
  const { mutate: deleteGuide } = useDeleteGuide();
  const { data: referrals } = useGuideReferrals(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [emailListId, setEmailListId] = useState<number>(0);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [sortOrder, setSortOrder] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const [copied, setCopied] = useState("");

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (guide && !initialized) {
      setTitle(guide.title || "");
      setDescription(guide.description || "");
      setCoverImage(guide.cover_image || "");
      setPdfUrl(guide.pdf_url || "");
      setEmailListId(guide.email_list_id || 0);
      setStatus(guide.status || "draft");
      setSortOrder(guide.sort_order || 0);
      setInitialized(true);
    }
  }, [guide, initialized]);

  async function handleCoverUpload(file: File) {
    setUploadingCover(true);
    setCoverProgress(0);
    try {
      const result = await uploadFile(file, undefined, (pct) => setCoverProgress(pct));
      const url = result.data.url as string;
      setCoverImage(url);
    } catch {
      // toast handled by uploadFile
    } finally {
      setUploadingCover(false);
    }
  }

  async function handlePdfUpload(file: File) {
    setUploadingPdf(true);
    setPdfProgress(0);
    try {
      const result = await uploadFile(file, undefined, (pct) => setPdfProgress(pct));
      const url = result.data.url as string;
      setPdfUrl(url);
    } catch {
      // toast handled by uploadFile
    } finally {
      setUploadingPdf(false);
    }
  }

  function handleSave() {
    updateGuide({
      id,
      title,
      description,
      cover_image: coverImage,
      pdf_url: pdfUrl,
      email_list_id: emailListId,
      status,
      sort_order: sortOrder,
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete Guide",
      description: `Delete "${title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) {
      deleteGuide(id, {
        onSuccess: () => router.push("/guides"),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Guide not found.</p>
        <Link href="/guides" className="text-accent hover:underline mt-2 inline-block">
          Back to Guides
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/guides"
            className="rounded-lg p-2 text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Edit Guide</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What's this guide about?"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <label className="block text-sm font-medium text-text-secondary">Cover Image</label>
            {coverImage ? (
              <div className="relative group">
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-full max-h-64 object-cover rounded-lg border border-border"
                />
                <button
                  onClick={() => setCoverImage("")}
                  className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-primary p-8 text-text-muted hover:border-accent hover:text-accent transition-colors"
              >
                {uploadingCover ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Uploading... {coverProgress}%</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-sm">Upload cover image</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCoverUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* PDF File */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <label className="block text-sm font-medium text-text-secondary">PDF File</label>
            {pdfUrl ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-bg-primary p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                  <span className="text-sm text-foreground truncate">{pdfUrl.split("/").pop()}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                    title="View PDF"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setPdfUrl("")}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={uploadingPdf}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-primary p-8 text-text-muted hover:border-accent hover:text-accent transition-colors"
              >
                {uploadingPdf ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Uploading... {pdfProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Upload PDF file</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePdfUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-4">
            <h3 className="font-medium text-foreground">Settings</h3>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email List</label>
              <select
                value={emailListId}
                onChange={(e) => setEmailListId(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value={0}>Select a list...</option>
                {(emailLists ?? []).map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-1">
                Only subscribers to this list can access the guide.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Shareable Links */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-accent" />
              <h3 className="font-medium text-foreground">Share Link</h3>
            </div>

            {guide.status === "published" ? (
              <>
                {/* Base URL */}
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin.replace("admin.", "") : ""}/guides/${guide.slug}`}
                    className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs text-text-secondary truncate"
                  />
                  <button
                    onClick={() => {
                      const url = `${window.location.origin.replace("admin.", "")}/guides/${guide.slug}`;
                      navigator.clipboard.writeText(url);
                      setCopied("base");
                      setTimeout(() => setCopied(""), 2000);
                    }}
                    className="rounded-lg border border-border p-2 text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors flex-shrink-0"
                    title="Copy link"
                  >
                    {copied === "base" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* Social links with ref tracking */}
                <p className="text-xs text-text-muted">Copy with referral tracking:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "LinkedIn", ref: "linkedin", color: "bg-blue-600/10 text-blue-400 hover:bg-blue-600/20" },
                    { label: "X / Twitter", ref: "twitter", color: "bg-zinc-600/10 text-zinc-300 hover:bg-zinc-600/20" },
                    { label: "Facebook", ref: "facebook", color: "bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20" },
                    { label: "YouTube", ref: "youtube", color: "bg-red-600/10 text-red-400 hover:bg-red-600/20" },
                  ].map((social) => (
                    <button
                      key={social.ref}
                      onClick={() => {
                        const url = `${window.location.origin.replace("admin.", "")}/guides/${guide.slug}?ref=${social.ref}`;
                        navigator.clipboard.writeText(url);
                        setCopied(social.ref);
                        setTimeout(() => setCopied(""), 2000);
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${social.color}`}
                    >
                      {copied === social.ref ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === social.ref ? "Copied!" : social.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-text-muted">Publish the guide to get a shareable link.</p>
            )}
          </div>

          {/* Stats + Referrals */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <h3 className="font-medium text-foreground">Stats</h3>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Views</span>
              <span className="font-medium text-foreground">{guide.view_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Downloads</span>
              <span className="font-medium text-foreground">{guide.download_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Created</span>
              <span className="text-text-secondary">{new Date(guide.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Slug</span>
              <span className="text-text-secondary text-xs">{guide.slug}</span>
            </div>

            {/* Referral breakdown */}
            {referrals && referrals.length > 0 && (
              <>
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-medium text-text-muted mb-2">Traffic Sources</p>
                  <div className="space-y-2">
                    {referrals.map((r) => {
                      const total = referrals.reduce((sum, x) => sum + x.count, 0);
                      const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                      return (
                        <div key={r.referrer}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-secondary capitalize">{r.referrer}</span>
                            <span className="text-text-muted">{r.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
