"use client";

import { useState, useEffect, useCallback } from "react";
import { hasPendingSync, processSyncQueue, initSyncManager } from "@/lib/sync-manager";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasPending, setHasPending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  function checkStatus() {
    setIsOnline(navigator.onLine);
    setHasPending(hasPendingSync());
  }

  useEffect(() => {
    checkStatus();
    initSyncManager();

    const interval = setInterval(checkStatus, 5_000);
    window.addEventListener("online", checkStatus);
    window.addEventListener("offline", checkStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", checkStatus);
      window.removeEventListener("offline", checkStatus);
    };
  }, []);

  const handleSync = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await processSyncQueue();
      setHasPending(hasPendingSync());
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline]);

  let color = "#22c55e";
  let title = "Online y sincronizado";

  if (!isOnline) {
    color = "#ef4444";
    title = "Offline – los cambios se guardan localmente";
  } else if (hasPending) {
    color = "#eab308";
    title = "Sincronización pendiente – click para sincronizar ahora";
  }

  return (
    <button
      onClick={() => void handleSync()}
      title={title}
      aria-label={title}
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        backgroundColor: color,
        border: "none",
        cursor: "pointer",
        padding: 0,
        zIndex: 9999,
        boxShadow: `0 0 0 2px rgba(0,0,0,0.4), 0 0 ${isSyncing ? "10px" : "4px"} ${color}`,
        transition: "box-shadow 0.3s, background-color 0.3s",
        animation: isSyncing ? "pulse 1s infinite" : "none",
      }}
    />
  );
}
