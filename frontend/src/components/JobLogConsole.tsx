import { useEffect, useRef, useState } from "react";
import { useSSE, type SseEvent } from "@/hooks/useSSE";
import { cn, formatDuration } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useRollbackJob } from "@/hooks/useWebflow";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  itemId?: string;
}

interface JobProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

interface JobConsoleProps {
  jobId: string;
  onComplete?: (job: unknown) => void;
}

const LEVEL_STYLES: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  success: "text-green-400",
};

export function JobLogConsole({ jobId, onComplete }: JobConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<JobProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    percentage: 0,
  });
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const rollback = useRollbackJob();

  // Tick elapsed timer
  useEffect(() => {
    if (jobStatus === "running" || jobStatus === "pending") {
      const interval = setInterval(
        () => setElapsed(Date.now() - startTime),
        1000
      );
      return () => clearInterval(interval);
    }
  }, [jobStatus, startTime]);

  const { connected } = useSSE({
    jobId,
    onEvent: (event: SseEvent) => {
      if (event.type === "snapshot" && event.job) {
        const j = event.job as {
          logs?: LogEntry[];
          progress?: JobProgress;
          status?: string;
        };
        setLogs(j.logs ?? []);
        if (j.progress) setProgress(j.progress);
        if (j.status) setJobStatus(j.status);
      } else if (event.type === "log" && event.log) {
        setLogs((prev) => [...prev, event.log!]);
      } else if (event.type === "progress" && event.progress) {
        setProgress(event.progress);
      } else if (event.type === "complete" && event.job) {
        const j = event.job as { status?: string };
        if (j.status) setJobStatus(j.status);
        onComplete?.(event.job);
      }
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleDownload = () => {
    window.open(api.jobs.reportUrl(jobId), "_blank");
  };

  const handleRollback = async () => {
    if (confirm("Rollback all changes made by this job? This cannot be undone.")) {
      await rollback.mutateAsync(jobId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {progress.completed + progress.failed} / {progress.total} items
            {progress.failed > 0 && (
              <span className="ml-2 text-red-500">
                ({progress.failed} failed)
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {formatDuration(elapsed)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                {
                  "bg-blue-100 text-blue-700": jobStatus === "running",
                  "bg-green-100 text-green-700": jobStatus === "completed",
                  "bg-red-100 text-red-700": jobStatus === "failed",
                  "bg-gray-100 text-gray-700": jobStatus === "pending",
                  "bg-purple-100 text-purple-700": jobStatus === "rolled_back",
                }
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", {
                "bg-blue-500 animate-pulse": jobStatus === "running",
                "bg-green-500": jobStatus === "completed",
                "bg-red-500": jobStatus === "failed",
                "bg-gray-400": jobStatus === "pending",
              })} />
              {jobStatus}
            </span>
            {connected && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
        <Progress value={progress.percentage} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">
          {progress.percentage}% complete
        </p>
      </div>

      {/* Log Console */}
      <div className="log-container bg-gray-950 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs space-y-0.5">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 leading-5">
            <span className="text-gray-500 shrink-0 tabular-nums">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span
              className={cn(
                "shrink-0 w-14 text-right",
                LEVEL_STYLES[log.level] ?? "text-gray-400"
              )}
            >
              [{log.level.toUpperCase()}]
            </span>
            <span className="text-gray-300 break-all">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-gray-500 italic">Waiting for job to start...</p>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Actions */}
      {(jobStatus === "completed" || jobStatus === "failed") && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV Report
          </Button>
          {jobStatus === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRollback}
              disabled={rollback.isPending}
              className="gap-2 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
            >
              <RotateCcw className="w-4 h-4" />
              {rollback.isPending ? "Rolling back..." : "Rollback Changes"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
