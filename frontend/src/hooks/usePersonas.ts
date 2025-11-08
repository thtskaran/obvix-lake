import { useCallback, useEffect, useState } from "react";
import { fetchPersonas } from "../app/api/endpoints";

export interface UsePersonasResult {
  personas: string[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePersonas(initialValue: string[] = []): UsePersonasResult {
  const [personas, setPersonas] = useState<string[]>(initialValue);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchPersonas(signal);
      if (signal?.aborted) {
        return;
      }
      setPersonas(list);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to load personas.";
      setError(message);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => {
      controller.abort();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { personas, isLoading, error, refresh };
}
