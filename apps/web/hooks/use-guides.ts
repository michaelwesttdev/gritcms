"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PremiumGuide } from "@repo/shared/types";

interface PaginatedMeta {
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export function usePublicGuides(params: { page?: number; pageSize?: number } = {}) {
  const { page = 1, pageSize = 12 } = params;
  return useQuery({
    queryKey: ["public-guides", { page, pageSize }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      const { data } = await api.get(`/api/p/guides?${sp}`);
      return {
        guides: (data.data || []) as PremiumGuide[],
        meta: data.meta as PaginatedMeta | undefined,
      };
    },
  });
}

export function usePublicGuide(slug: string) {
  return useQuery({
    queryKey: ["public-guides", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/p/guides/${slug}`);
      return data.data as PremiumGuide;
    },
    enabled: !!slug,
  });
}

export function useGuideAccess(slug: string, emailB64: string) {
  return useQuery({
    queryKey: ["guide-access", slug, emailB64],
    queryFn: async () => {
      const { data } = await api.get(`/api/p/guides/${slug}/access?e=${encodeURIComponent(emailB64)}`);
      return data as { has_access: boolean; list_name: string; pdf_url?: string };
    },
    enabled: !!slug && !!emailB64,
  });
}

/** Fire-and-forget view tracking — runs once per slug per mount. */
export function useTrackGuideView(slug: string, ref: string = "direct") {
  const tracked = useRef(false);
  useEffect(() => {
    if (!slug || tracked.current) return;
    tracked.current = true;
    api.post(`/api/p/guides/${slug}/view?ref=${encodeURIComponent(ref)}`).catch(() => {});
  }, [slug, ref]);
}
