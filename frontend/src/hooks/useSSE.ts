import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "../lib/api";

export interface SseEvent {
  type: "snapshot" | "log" | "progress" | "complete" | "rollback";
  job?: unknown;
  log?: {
    timestamp: string;
    level: "info" | "warn" | "error" | "success";
    message: string;
    itemId?: string;
  };
  progress?: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
}

interface UseSSEOptions {
  jobId: string | null;
  onEvent?: (event: SseEvent) => void;
  onComplete?: (job: unknown) => void;
}

export function useSSE({ jobId, onEvent, onComplete }: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const url = api.jobs.streamUrl(jobId);
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (e) => {
      try {
        const event: SseEvent = JSON.parse(e.data);
        onEvent?.(event);

        if (event.type === "complete" || event.type === "rollback") {
          onComplete?.(event.job);
          disconnect();
        }
      } catch {
        // Ignore parse errors (heartbeat lines are not JSON)
      }
    };

    es.onerror = () => {
      setError("Stream connection lost");
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, error, disconnect };
}
