import { create } from "zustand";

export type ContentTone =
  | "professional"
  | "casual"
  | "technical"
  | "friendly"
  | "authoritative"
  | "conversational";

export type OperationMode = "generate" | "seo-rewrite" | "auto-bulk";

interface Site {
  id: string;
  displayName: string;
  shortName: string;
}

interface Collection {
  id: string;
  displayName: string;
  singularName: string;
  slug: string;
  fields: Array<{
    id: string;
    slug: string;
    displayName: string;
    type: string;
    isEditable: boolean;
  }>;
}

interface AppState {
  // Auth
  appApiKey: string;
  webflowToken: string;
  setAppApiKey: (key: string) => void;
  setWebflowToken: (token: string) => void;

  // Connected site
  sites: Site[];
  setSites: (sites: Site[]) => void;
  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;

  // Collections
  collections: Collection[];
  setCollections: (cols: Collection[]) => void;
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
  selectedCollection: Collection | null;
  setSelectedCollection: (col: Collection | null) => void;

  // Job config
  mode: OperationMode;
  setMode: (mode: OperationMode) => void;
  dryRun: boolean;
  setDryRun: (v: boolean) => void;
  selectedItemIds: string[];
  setSelectedItemIds: (ids: string[]) => void;
  tone: ContentTone;
  setTone: (t: ContentTone) => void;
  keywords: string[];
  setKeywords: (kw: string[]) => void;
  promptTemplate: string;
  setPromptTemplate: (t: string) => void;
  concurrency: number;
  setConcurrency: (n: number) => void;

  // Active job tracking
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isConnected: boolean;
  setIsConnected: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  appApiKey: import.meta.env.VITE_APP_API_KEY ?? "",
  webflowToken: "",
  setAppApiKey: (appApiKey) => set({ appApiKey }),
  setWebflowToken: (webflowToken) => set({ webflowToken }),

  // Sites
  sites: [],
  setSites: (sites) => set({ sites }),
  selectedSiteId: null,
  setSelectedSiteId: (selectedSiteId) => set({ selectedSiteId }),

  // Collections
  collections: [],
  setCollections: (collections) => set({ collections }),
  selectedCollectionId: null,
  setSelectedCollectionId: (selectedCollectionId) => set({ selectedCollectionId }),
  selectedCollection: null,
  setSelectedCollection: (selectedCollection) => set({ selectedCollection }),

  // Job config
  mode: "seo-rewrite",
  setMode: (mode) => set({ mode }),
  dryRun: true,
  setDryRun: (dryRun) => set({ dryRun }),
  selectedItemIds: [],
  setSelectedItemIds: (selectedItemIds) => set({ selectedItemIds }),
  tone: "professional",
  setTone: (tone) => set({ tone }),
  keywords: [],
  setKeywords: (keywords) => set({ keywords }),
  promptTemplate: "",
  setPromptTemplate: (promptTemplate) => set({ promptTemplate }),
  concurrency: 5,
  setConcurrency: (concurrency) => set({ concurrency }),

  // Active job
  activeJobId: null,
  setActiveJobId: (activeJobId) => set({ activeJobId }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  isConnected: false,
  setIsConnected: (isConnected) => set({ isConnected }),
}));
