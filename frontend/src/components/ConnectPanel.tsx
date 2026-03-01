import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { Zap, Key, Globe, CheckCircle2, AlertCircle } from "lucide-react";

export function ConnectPanel() {
  const {
    appApiKey,
    setAppApiKey,
    webflowToken,
    setWebflowToken,
    setIsConnected,
    setSites,
    setSelectedSiteId,
  } = useAppStore();

  const [localAppKey, setLocalAppKey] = useState(appApiKey);
  const [localWfToken, setLocalWfToken] = useState(webflowToken);
  const [error, setError] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: async () => {
      // Save keys to store so interceptors use them
      setAppApiKey(localAppKey);
      setWebflowToken(localWfToken);

      // Test connection
      const res = await api.webflow.getSites();
      return (res.data as { data: unknown[] }).data;
    },
    onSuccess: (sites) => {
      setSites(sites as Parameters<typeof setSites>[0]);
      if ((sites as Array<{ id: string }>).length > 0) {
        setSelectedSiteId((sites as Array<{ id: string }>)[0]!.id);
      }
      setIsConnected(true);
      setError(null);
    },
    onError: (err) => {
      setError((err as Error).message);
      setIsConnected(false);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Webflow AI Optimizer
          </h1>
          <p className="text-slate-400">
            ML-powered content generation & SEO rewrites for your Webflow CMS
          </p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white text-lg">Connect Your Site</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your API keys to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* App API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Key className="w-3.5 h-3.5" />
                App API Key
              </label>
              <Input
                type="password"
                placeholder="your-app-api-key"
                value={localAppKey}
                onChange={(e) => setLocalAppKey(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Set APP_API_KEY in your .env file
              </p>
            </div>

            {/* Webflow Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Webflow API Token
              </label>
              <Input
                type="password"
                placeholder="your-webflow-site-api-token"
                value={localWfToken}
                onChange={(e) => setLocalWfToken(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Webflow Dashboard → Site Settings → API Access
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-md p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Connect Button */}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => connectMutation.mutate()}
              disabled={
                connectMutation.isPending ||
                !localAppKey.trim() ||
                !localWfToken.trim()
              }
            >
              {connectMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Connect to Webflow
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Features hint */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "✍️", label: "AI Generate" },
            { icon: "🔍", label: "SEO Rewrite" },
            { icon: "⚡", label: "Bulk Update" },
          ].map((f) => (
            <div
              key={f.label}
              className="rounded-lg border border-slate-700 bg-slate-800/30 p-3"
            >
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs text-slate-400">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
