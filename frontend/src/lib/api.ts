import axios, { type AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Inject API key from store before each request
apiClient.interceptors.request.use((config) => {
  // Import store lazily to avoid circular deps
  const { useAppStore } = require("../store/appStore");
  const apiKey = useAppStore.getState().appApiKey;
  const webflowToken = useAppStore.getState().webflowToken;

  if (apiKey) config.headers["X-API-Key"] = apiKey;
  if (webflowToken) config.headers["X-Webflow-Token"] = webflowToken;

  return config;
});

// Normalize errors
apiClient.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const msg =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Unknown API error";
    throw new Error(msg);
  }
);

// ─── Typed API methods ────────────────────────────────────────────────────────

export const api = {
  // Health
  health: () => apiClient.get("/health"),

  // Webflow
  webflow: {
    getSites: () =>
      apiClient.get<{ success: boolean; data: unknown[] }>("/webflow/sites"),
    getSite: (siteId: string) =>
      apiClient.get(`/webflow/sites/${siteId}`),
    getCollections: (siteId: string) =>
      apiClient.get(`/webflow/sites/${siteId}/collections`),
    getCollection: (collectionId: string) =>
      apiClient.get(`/webflow/collections/${collectionId}`),
    getItems: (collectionId: string, params?: { limit?: number; offset?: number; fetchAll?: boolean }) =>
      apiClient.get(`/webflow/collections/${collectionId}/items`, { params }),
  },

  // AI
  ai: {
    generate: (payload: { text: string; fieldName: string; options: unknown }) =>
      apiClient.post("/ai/generate", payload),
    seoRewrite: (payload: { content: Record<string, unknown>; options: unknown }) =>
      apiClient.post("/ai/seo-rewrite", payload),
    analyze: (payload: { content: Record<string, unknown>; targetKeywords?: string[] }) =>
      apiClient.post("/ai/analyze", payload),
  },

  // Jobs
  jobs: {
    create: (payload: unknown) =>
      apiClient.post<{ success: boolean; data: { jobId: string; status: string; streamUrl: string } }>("/jobs", payload),
    list: () => apiClient.get("/jobs"),
    get: (jobId: string) => apiClient.get(`/jobs/${jobId}`),
    rollback: (jobId: string) => apiClient.post(`/jobs/${jobId}/rollback`),
    reportUrl: (jobId: string) => `${BASE_URL}/jobs/${jobId}/report`,
    streamUrl: (jobId: string) => `${BASE_URL}/jobs/${jobId}/stream`,
  },
};
