import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAppStore } from "../store/appStore";

export function useSites() {
  const webflowToken = useAppStore((s) => s.webflowToken);
  return useQuery({
    queryKey: ["sites", webflowToken],
    queryFn: async () => {
      const res = await api.webflow.getSites();
      return (res.data as { data: unknown[] }).data;
    },
    enabled: !!webflowToken,
    retry: 1,
  });
}

export function useCollections(siteId: string | null) {
  return useQuery({
    queryKey: ["collections", siteId],
    queryFn: async () => {
      const res = await api.webflow.getCollections(siteId!);
      return (res.data as { data: unknown[] }).data;
    },
    enabled: !!siteId,
  });
}

export function useCollection(collectionId: string | null) {
  return useQuery({
    queryKey: ["collection", collectionId],
    queryFn: async () => {
      const res = await api.webflow.getCollection(collectionId!);
      return (res.data as { data: unknown }).data;
    },
    enabled: !!collectionId,
  });
}

export function useItems(
  collectionId: string | null,
  options?: { limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ["items", collectionId, options],
    queryFn: async () => {
      const res = await api.webflow.getItems(collectionId!, options);
      return (res.data as { data: unknown }).data;
    },
    enabled: !!collectionId,
  });
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await api.jobs.list();
      return (res.data as { data: unknown[] }).data;
    },
    refetchInterval: 5000, // poll every 5s
  });
}

export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await api.jobs.get(jobId!);
      return (res.data as { data: unknown }).data;
    },
    enabled: !!jobId,
    refetchInterval: (data: unknown) => {
      const job = data as { status?: string } | undefined;
      if (!job) return 2000;
      return job.status === "running" || job.status === "pending" ? 2000 : false;
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => api.jobs.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useRollbackJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.jobs.rollback(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useSeoAnalyze() {
  return useMutation({
    mutationFn: (payload: { content: Record<string, unknown>; targetKeywords?: string[] }) =>
      api.ai.analyze(payload),
  });
}
