"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Lock, Mail, Loader2, BookMarked } from "lucide-react";
import { usePublicGuide, useGuideAccess } from "@/hooks/use-guides";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function GuideDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const { data: guide, isLoading: guideLoading } = usePublicGuide(slug);

  // Check for email and referrer in URL
  const urlEmail = searchParams.get("e") || "";
  const ref = searchParams.get("ref") || "direct";

  const [emailInput, setEmailInput] = useState("");
  const [emailB64, setEmailB64] = useState(urlEmail);
  const [submitted, setSubmitted] = useState(!!urlEmail);

  const { data: access, isLoading: accessLoading } = useGuideAccess(slug, emailB64);

  useEffect(() => {
    if (urlEmail) {
      setEmailB64(urlEmail);
      setSubmitted(true);
    }
  }, [urlEmail]);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const b64 = btoa(emailInput.trim());
    setEmailB64(b64);
    setSubmitted(true);
  }

  if (guideLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <BookMarked className="mx-auto h-12 w-12 text-text-muted mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Guide not found</h1>
        <Link href="/guides" className="mt-4 inline-block text-accent hover:underline">
          Back to Guides
        </Link>
      </div>
    );
  }

  const downloadUrl = `${API_URL}/api/p/guides/${slug}/download?e=${encodeURIComponent(emailB64)}&ref=${encodeURIComponent(ref)}`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Back link */}
      <Link
        href="/guides"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        All Guides
      </Link>

      {/* Guide header */}
      <div className="mb-8">
        {guide.cover_image && (
          <img
            src={guide.cover_image}
            alt={guide.title}
            className="w-full max-h-80 object-cover rounded-xl border border-border mb-6"
          />
        )}
        <h1 className="text-3xl font-bold text-foreground">{guide.title}</h1>
        {guide.description && (
          <p className="mt-3 text-lg text-text-secondary">{guide.description}</p>
        )}
      </div>

      {/* Access gate */}
      {!submitted ? (
        /* Step 1: Enter email */
        <div className="rounded-xl border border-border bg-bg-elevated p-8 text-center max-w-md mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <Mail className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Enter your email</h2>
          <p className="text-sm text-text-secondary mb-6">
            This guide is available to newsletter subscribers. Enter your email to access it.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              Access Guide
            </button>
          </form>
        </div>
      ) : accessLoading ? (
        /* Loading access check */
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : access?.has_access ? (
        /* Access granted: show PDF */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-400 font-medium">Access granted</p>
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-bg-elevated">
            <iframe
              src={access.pdf_url}
              className="w-full h-[80vh]"
              title={guide.title}
            />
          </div>
        </div>
      ) : (
        /* No access: show subscribe prompt */
        <div className="rounded-xl border border-border bg-bg-elevated p-8 text-center max-w-md mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10">
            <Lock className="h-7 w-7 text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Subscription Required</h2>
          <p className="text-sm text-text-secondary mb-4">
            This guide is exclusive to{" "}
            <span className="font-medium text-foreground">{access?.list_name || "our newsletter"}</span>{" "}
            subscribers.
          </p>
          <p className="text-sm text-text-muted">
            Subscribe to the list to get access to this and other premium guides.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setEmailB64("");
              setEmailInput("");
            }}
            className="mt-4 text-sm text-accent hover:underline"
          >
            Try a different email
          </button>
        </div>
      )}
    </div>
  );
}
