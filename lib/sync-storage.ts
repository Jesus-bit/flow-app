"use client";

import type { StateStorage } from "zustand/middleware";

const SYNC_QUEUE_KEY = "__sync_queue";

type SyncQueueItem = {
  name: string;
  value: string;
  timestamp: number;
};

// ── Helpers de autenticación ──

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

// ── Callbacks de rehidratación (para actualizar store cuando llegan datos nuevos del servidor) ──

const rehydrateCallbacks = new Map<string, () => void>();

export function registerRehydrate(name: string, fn: () => void): void {
  rehydrateCallbacks.set(name, fn);
}

// ── Cola de sync pendiente ──

function readQueue(): SyncQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]") as SyncQueueItem[];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

function addToQueue(name: string, value: string): void {
  const queue = readQueue();
  const idx = queue.findIndex((i) => i.name === name);
  const item: SyncQueueItem = { name, value, timestamp: Date.now() };
  if (idx >= 0) queue[idx] = item;
  else queue.push(item);
  writeQueue(queue);
}

function removeFromQueue(name: string): void {
  writeQueue(readQueue().filter((i) => i.name !== name));
}

export function hasPendingSync(): boolean {
  return readQueue().length > 0;
}

// ── Comunicación con el servidor ──

async function fetchFromServer(
  name: string
): Promise<{ data: string; updated_at: number } | null> {
  try {
    const res = await fetch(`/api/state?key=${encodeURIComponent(name)}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: unknown; updated_at: number };
    if (!json.data) return null;
    // El servidor devuelve el value deserializado; lo re-serializamos
    const data =
      typeof json.data === "string" ? json.data : JSON.stringify(json.data);
    return { data, updated_at: json.updated_at };
  } catch {
    return null;
  }
}

async function sendToServer(name: string, value: string): Promise<boolean> {
  try {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ key: name, value }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── StateStorage híbrido (offline-first) ──

export const syncStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const local = localStorage.getItem(name);

    // Background: si el servidor tiene datos más recientes, actualiza localStorage y rehidrata
    void fetchFromServer(name).then((serverData) => {
      if (!serverData) return;

      let localTimestamp = 0;
      if (local) {
        try {
          const parsed = JSON.parse(local) as {
            state?: { _lastModified?: number };
          };
          localTimestamp = parsed?.state?._lastModified ?? 0;
        } catch {}
      }

      if (serverData.updated_at > localTimestamp) {
        localStorage.setItem(name, serverData.data);
        const rehydrate = rehydrateCallbacks.get(name);
        if (rehydrate) rehydrate();
      }
    });

    return local;
  },

  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value);

    // Background sync al servidor
    void sendToServer(name, value).then((ok) => {
      if (ok) removeFromQueue(name);
      else addToQueue(name, value);
    });
  },

  removeItem: (name: string): void => {
    localStorage.removeItem(name);
    removeFromQueue(name);

    void fetch(`/api/state?key=${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    }).catch(() => {});
  },
};
