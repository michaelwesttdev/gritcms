"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { PremiumGuide } from "@repo/shared/types";

export function useGuides() {
  return useQuery({
    queryKey: ["guides"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/guides");
      return data as { data: PremiumGuide[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useGuide(id: number) {
  return useQuery({
    queryKey: ["guides", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/guides/${id}`);
      return data.data as PremiumGuide;
    },
    enabled: id > 0,
  });
}

export function useCreateGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<PremiumGuide>) => {
      const { data } = await apiClient.post("/api/guides", body);
      return data.data as PremiumGuide;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guides"] });
      toast.success("Guide created");
    },
    onError: () => toast.error("Failed to create guide"),
  });
}

export function useUpdateGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PremiumGuide> & { id: number }) => {
      const { data } = await apiClient.put(`/api/guides/${id}`, body);
      return data.data as PremiumGuide;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["guides"] });
      qc.invalidateQueries({ queryKey: ["guides", vars.id] });
      toast.success("Guide updated");
    },
    onError: () => toast.error("Failed to update guide"),
  });
}

export function useDeleteGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/guides/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guides"] });
      toast.success("Guide deleted");
    },
    onError: () => toast.error("Failed to delete guide"),
  });
}

export function useGuideReferrals(id: number) {
  return useQuery({
    queryKey: ["guides", id, "referrals"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/guides/${id}/referrals`);
      return data.data as { referrer: string; count: number }[];
    },
    enabled: id > 0,
  });
}
