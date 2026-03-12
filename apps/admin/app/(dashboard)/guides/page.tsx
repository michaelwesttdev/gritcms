"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGuides, useCreateGuide, useDeleteGuide } from "@/hooks/use-guides";
import {
  Plus,
  Trash2,
  Loader2,
  X,
  BookMarked,
  Download,
  Eye,
} from "@/lib/icons";
import { useConfirm } from "@/hooks/use-confirm";
import type { PremiumGuide } from "@repo/shared/types";

const statusBadge: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-400",
  published: "bg-green-500/10 text-green-400",
};

export default function GuidesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { data, isLoading } = useGuides();
  const { mutate: createGuide } = useCreateGuide();
  const { mutate: deleteGuide } = useDeleteGuide();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  const guides = data?.data ?? [];
  const meta = data?.meta;

  const totalGuides = meta?.total ?? guides.length;
  const publishedCount = guides.filter((g) => g.status === "published").length;
  const totalViews = guides.reduce((sum, g) => sum + (g.view_count ?? 0), 0);
  const totalDownloads = guides.reduce((sum, g) => sum + (g.download_count ?? 0), 0);

  function handleCreate() {
    if (!title.trim()) return;
    createGuide(
      { title: title.trim() },
      {
        onSuccess: (guide) => {
          setShowCreate(false);
          setTitle("");
          router.push(`/guides/${guide.id}`);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Premium Guides</h1>
          <p className="text-text-secondary mt-1">
            PDF guides gated behind email list subscriptions.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Guide
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">Total Guides</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalGuides}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">Published</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{publishedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">Total Views</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{totalViews}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">Total Downloads</p>
          <p className="text-2xl font-bold text-accent mt-1">{totalDownloads}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : guides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-8 text-center">
          <BookMarked className="mx-auto h-10 w-10 text-text-muted mb-3" />
          <p className="text-text-muted">No guides yet. Create your first premium guide.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-elevated text-left text-text-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Email List</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Views</th>
                <th className="px-4 py-3 font-medium text-right">Downloads</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((guide) => (
                <tr key={guide.id} className="border-b border-border last:border-0 hover:bg-bg-hover/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/guides/${guide.id}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {guide.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {guide.email_list?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusBadge[guide.status] ?? "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {guide.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {guide.view_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" />
                      {guide.download_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(guide.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/guides/${guide.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-foreground"
                        title="Edit"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete Guide",
                            description: `Delete "${guide.title}"? This cannot be undone.`,
                            confirmLabel: "Delete",
                            variant: "danger",
                          });
                          if (ok) deleteGuide(guide.id);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Guide</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. The Ultimate TypeScript Guide"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
