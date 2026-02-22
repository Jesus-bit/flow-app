"use client";

import { hasPendingSync } from "./sync-storage";

export { hasPendingSync };

const SYNC_QUEUE_KEY = "__sync_queue";

type SyncQueueItem = {
  name: string;
  value: string;
  timestamp: number;
};

function getAuthHeader(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const cookies = Object.fromEntries(
    document.cookie.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    })
  );
  const token = cookies["auth-token"];
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function processSyncQueue(): Promise<void> {
  try {
    const queue: SyncQueueItem[] = JSON.parse(
      localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]"
    );
    if (queue.length === 0) return;

    const successful: string[] = [];

    for (const item of queue) {
      try {
        const res = await fetch("/api/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({ key: item.name, value: item.value }),
        });
        if (res.ok) successful.push(item.name);
      } catch {
        // Si falla, lo dejamos en la cola
      }
    }

    const remaining = queue.filter((i) => !successful.includes(i.name));
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // Silencioso
  }
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function initSyncManager(): void {
  if (typeof window === "undefined") return;

  // Procesar cola cuando vuelve la conexión
  window.addEventListener("online", () => {
    void processSyncQueue();
    startInterval();
  });

  // Si hay items pendientes, arrancar el intervalo
  if (hasPendingSync()) startInterval();
}

function startInterval(): void {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    if (!hasPendingSync()) {
      clearInterval(syncInterval!);
      syncInterval = null;
      return;
    }
    await processSyncQueue();
  }, 30_000);
}
