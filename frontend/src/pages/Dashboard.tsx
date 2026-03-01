import { useState, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { useCollections, useItems, useJobs, useCreateJob } from "@/hooks/useWebflow";
import { MetricCard } from "@/components/MetricCard";
import { JobLogConsole } from "@/components/JobLogConsole";
import { SeoScoreRing, SeoScoreBreakdown } from "@/components/SeoScoreRing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Zap, FileText, Clock, TrendingUp,
  Play, Eye, RotateCcw, ChevronDown, Plus, X,
  CheckSquare, Square, Loader2,
} from "lucide-react";
import { cn, formatDuration, jobStatusColor, truncate } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "optimizer" | "jobs" | "analytics";
type OperationMode = "generate" | "seo-rewrite" | "auto-bulk";

export function Dashboard() {
  const {
    selectedSiteId,
    selectedCollectionId,
    setSelectedCollectionId,
    setSelectedCollection,
    mode,
    setMode,
    dryRun,
    setDryRun,
    tone,
    setTone,
    keywords,
    setKeywords,
    promptTemplate,
    setPromptTemplate,
    concurrency,
    setConcurrency,
    activeJobId,
    setActiveJobId,
    selectedItemIds,
    setSelectedItemIds,
    sites,
    selectedSiteId: siteId,
    setSelectedSiteId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<Tab>("optimizer");
  const [kwInput, setKwInput] = useState("");
  const [itemFilter, setItemFilter] = useState("");

  const collections = useCollections(selectedSiteId);
  const items = useItems(selectedCollectionId, { limit: 100 });
  const jobs = useJobs();
  const createJob = useCreateJob();

  // ─── Metrics derived from job history ────────────────────────────────────────

  const metrics = useMemo(() => {
    const allJobs = (jobs.data as Array<{
      metrics?: {
        itemsProcessed?: number;
        avgSeoScoreImprovement?: number;
        estimatedTimeSavedMinutes?: number;
      };
    }>) ?? [];
    return {
      totalItemsProcessed: allJobs.reduce(
        (s, j) => s + (j.metrics?.itemsProcessed ?? 0), 0
      ),
      avgSeoImprovement: allJobs.length > 0
        ? (allJobs.reduce((s, j) => s + (j.metrics?.avgSeoScoreImprovement ?? 0), 0) / allJobs.length).toFixed(1)
        : "0",
      timeSaved: allJobs.reduce(
        (s, j) => s + (j.metrics?.estimatedTimeSavedMinutes ?? 0), 0
      ),
      jobCount: allJobs.length,
    };
  }, [jobs.data]);

  // ─── Item selection ───────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    const allItems = (items.data as { items?: Array<{ id: string; fieldData: Record<string, unknown> }> })?.items ?? [];
    if (!itemFilter) return allItems;
    const f = itemFilter.toLowerCase();
    return allItems.filter(
      (item) =>
        (item.fieldData["name"] as string ?? "").toLowerCase().includes(f) ||
        item.id.includes(f)
    );
  }, [items.data, itemFilter]);

  const toggleItem = (id: string) => {
    setSelectedItemIds(
      selectedItemIds.includes(id)
        ? selectedItemIds.filter((i) => i !== id)
        : [...selectedItemIds, id]
    );
  };

  const toggleAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    }
  };

  // ─── Start job ────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!selectedCollectionId) return;

    const webflowToken = useAppStore.getState().webflowToken;
    const result = await createJob.mutateAsync({
      mode,
      webflowToken,
      siteId: selectedSiteId ?? "",
      collectionId: selectedCollectionId,
      itemIds: selectedItemIds.length > 0 ? selectedItemIds : undefined,
      dryRun,
      concurrency,
      options: {
        tone,
        targetKeywords: keywords,
        promptTemplate: promptTemplate || undefined,
        optimizeTitle: true,
        optimizeMeta: true,
        improveReadability: true,
        boostEeat: true,
      },
    });

    setActiveJobId(result.data.data.jobId);
    setActiveTab("jobs");
  };

  // ─── Chart data (mock from jobs) ─────────────────────────────────────────────

  const chartData = useMemo(() => {
    const allJobs = (jobs.data as Array<{
      createdAt: string;
      metrics?: { avgSeoScoreImprovement?: number; itemsProcessed?: number };
    }>) ?? [];
    return allJobs.slice(-10).map((j) => ({
      date: new Date(j.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" }),
      seoImprovement: j.metrics?.avgSeoScoreImprovement ?? 0,
      items: j.metrics?.itemsProcessed ?? 0,
    }));
  }, [jobs.data]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 leading-none">
                  Webflow AI Optimizer
                </h1>
                <p className="text-xs text-muted-foreground">
                  GPT-4o powered content & SEO
                </p>
              </div>
            </div>

            {/* Site selector */}
            <div className="flex items-center gap-2">
              <select
                className="text-sm border rounded-md px-3 py-1.5 bg-white"
                value={siteId ?? ""}
                onChange={(e) => setSelectedSiteId(e.target.value || null)}
              >
                <option value="">Select site...</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Items Processed"
            value={metrics.totalItemsProcessed.toLocaleString()}
            icon={FileText}
            color="blue"
            subtitle="All time"
          />
          <MetricCard
            title="Avg SEO Boost"
            value={`+${metrics.avgSeoImprovement} pts`}
            icon={TrendingUp}
            color="green"
            subtitle="Score improvement"
          />
          <MetricCard
            title="Time Saved"
            value={`${metrics.timeSaved}m`}
            icon={Clock}
            color="purple"
            subtitle="Est. manual effort"
          />
          <MetricCard
            title="Total Jobs"
            value={metrics.jobCount}
            icon={BarChart3}
            color="orange"
            subtitle="Bulk operations"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6">
          {(["optimizer", "jobs", "analytics"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-gray-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Optimizer Tab ── */}
        {activeTab === "optimizer" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Config */}
            <div className="lg:col-span-1 space-y-4">
              {/* Collection selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">1. Select Collection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {collections.isLoading ? (
                    <div className="skeleton h-10 rounded-md" />
                  ) : (
                    <select
                      className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                      value={selectedCollectionId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCollectionId(val || null);
                        const col = (collections.data as Array<{ id: string }> ?? []).find(
                          (c) => c.id === val
                        );
                        setSelectedCollection(col as Parameters<typeof setSelectedCollection>[0] ?? null);
                      }}
                    >
                      <option value="">Choose collection...</option>
                      {(collections.data as Array<{ id: string; displayName: string }> ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName}
                        </option>
                      ))}
                    </select>
                  )}
                </CardContent>
              </Card>

              {/* Mode */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">2. Operation Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {([
                    { value: "generate", label: "✍️ Generate Content", desc: "Create new content from prompts" },
                    { value: "seo-rewrite", label: "🔍 SEO Rewrite", desc: "Optimize existing content" },
                    { value: "auto-bulk", label: "⚡ Auto Bulk Update", desc: "Full optimization pass" },
                  ] as Array<{ value: OperationMode; label: string; desc: string }>).map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 transition-colors",
                        mode === m.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">3. Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Tone</label>
                    <select
                      className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                      value={tone}
                      onChange={(e) => setTone(e.target.value as typeof tone)}
                    >
                      {["professional", "casual", "technical", "friendly", "authoritative", "conversational"].map(
                        (t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Target Keywords
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add keyword..."
                        value={kwInput}
                        onChange={(e) => setKwInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && kwInput.trim()) {
                            setKeywords([...keywords, kwInput.trim()]);
                            setKwInput("");
                          }
                        }}
                        className="text-sm h-8"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (kwInput.trim()) {
                            setKeywords([...keywords, kwInput.trim()]);
                            setKwInput("");
                          }
                        }}
                        className="h-8 px-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-[28px]">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5"
                        >
                          {kw}
                          <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Prompt template (generate mode only) */}
                  {mode === "generate" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Prompt Template
                      </label>
                      <Textarea
                        placeholder="Write compelling {fieldName} for {context}..."
                        value={promptTemplate}
                        onChange={(e) => setPromptTemplate(e.target.value)}
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                  )}

                  {/* Concurrency + Dry Run */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Concurrency: {concurrency}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={concurrency}
                        onChange={(e) => setConcurrency(Number(e.target.value))}
                        className="w-28"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Dry Run</span>
                    </label>
                  </div>

                  {dryRun && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      Preview mode — no changes will be written to Webflow
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Launch */}
              <Button
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={!selectedCollectionId || createJob.isPending}
                onClick={handleStart}
              >
                {createJob.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : dryRun ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {dryRun ? "Preview (Dry Run)" : "Start Optimization"}
                {selectedItemIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedItemIds.length} items
                  </Badge>
                )}
              </Button>
            </div>

            {/* Right: Item browser */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Collection Items
                      {(items.data as { pagination?: { total?: number } })?.pagination?.total !== undefined && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          ({(items.data as { pagination: { total: number } }).pagination.total} total)
                        </span>
                      )}
                    </CardTitle>
                    {selectedItemIds.length > 0 && (
                      <Badge variant="secondary">
                        {selectedItemIds.length} selected
                      </Badge>
                    )}
                  </div>
                  <Input
                    placeholder="Filter items..."
                    value={itemFilter}
                    onChange={(e) => setItemFilter(e.target.value)}
                    className="h-8 text-sm"
                  />
                </CardHeader>
                <CardContent>
                  {!selectedCollectionId ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <FileText className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm">Select a collection to browse items</p>
                    </div>
                  ) : items.isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton h-12 rounded-md" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Select all */}
                      {filteredItems.length > 0 && (
                        <button
                          onClick={toggleAll}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-gray-700 py-1 px-2 rounded w-full text-left mb-2"
                        >
                          {selectedItemIds.length === filteredItems.length ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                          {selectedItemIds.length === filteredItems.length
                            ? "Deselect all"
                            : `Select all (${filteredItems.length})`}
                        </button>
                      )}

                      <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1">
                        {filteredItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={cn(
                              "w-full flex items-center gap-3 text-left rounded-md px-3 py-2 text-sm transition-colors",
                              selectedItemIds.includes(item.id)
                                ? "bg-blue-50 border border-blue-200"
                                : "hover:bg-gray-50 border border-transparent"
                            )}
                          >
                            {selectedItemIds.includes(item.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">
                                {truncate(
                                  (item.fieldData["name"] as string) ??
                                  (item.fieldData["slug"] as string) ??
                                  "Untitled",
                                  50
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.id}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Jobs Tab ── */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            {activeJobId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Job</CardTitle>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {activeJobId}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <JobLogConsole
                    jobId={activeJobId}
                    onComplete={() => {
                      // keep activeJobId visible but stop listening
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Job History */}
            <Card>
              <CardHeader>
                <CardTitle>Job History</CardTitle>
                <CardDescription>
                  Recent bulk operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobs.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="skeleton h-14 rounded-md" />
                    ))}
                  </div>
                ) : (jobs.data as Array<unknown> ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No jobs yet. Start an optimization run!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(jobs.data as Array<{
                      id: string;
                      mode: string;
                      status: string;
                      dryRun: boolean;
                      createdAt: string;
                      progress: { percentage: number; total: number; completed: number };
                      metrics: { avgSeoScoreImprovement: number };
                    }> ?? []).map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setActiveJobId(job.id)}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50",
                          activeJobId === job.id && "border-blue-300 bg-blue-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium capitalize">{job.mode}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", jobStatusColor(job.status))}>
                              {job.status}
                            </span>
                            {job.dryRun && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                dry-run
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {job.id}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {job.progress.completed}/{job.progress.total} items
                          </p>
                          {job.metrics.avgSeoScoreImprovement > 0 && (
                            <p className="text-xs text-green-600 font-medium">
                              +{job.metrics.avgSeoScoreImprovement} SEO pts
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SEO improvement chart */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Score Improvement Over Time</CardTitle>
                <CardDescription>Average points gained per job</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">Run more jobs to see trends</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="seoImprovement"
                        name="SEO Improvement"
                        stroke="#2563eb"
                        fill="#eff6ff"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Items processed chart */}
            <Card>
              <CardHeader>
                <CardTitle>Items Processed Per Job</CardTitle>
                <CardDescription>Volume of content updates</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">Run more jobs to see trends</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="items"
                        name="Items Processed"
                        stroke="#16a34a"
                        fill="#f0fdf4"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Summary metrics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>All-Time Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-50">
                    <p className="text-3xl font-bold text-blue-700">
                      {metrics.totalItemsProcessed}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Items Optimized</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50">
                    <p className="text-3xl font-bold text-green-700">
                      +{metrics.avgSeoImprovement}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Avg SEO Points</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-50">
                    <p className="text-3xl font-bold text-purple-700">
                      {Math.floor(metrics.timeSaved / 60)}h
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Hours Saved</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-50">
                    <p className="text-3xl font-bold text-orange-700">
                      {metrics.jobCount}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Jobs Run</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
