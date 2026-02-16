"use client";

import { useState, useCallback, useRef } from "react";
import { useFlowStore } from "../store";
import ThemeToggle from "./ThemeToggle";

export default function SectorMap() {
  const sectors = useFlowStore((s) => s.sectors);
  const navigateTo = useFlowStore((s) => s.navigateTo);
  const renameSector = useFlowStore((s) => s.renameSector);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(
    (sectorId: string) => {
      if (renamingId) return;
      navigateTo({ view: "canvas", sectorId });
    },
    [navigateTo, renamingId]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, sectorId: string, currentName: string) => {
      e.stopPropagation();
      setRenamingId(sectorId);
      setRenameValue(currentName);
      setConfirmingId(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    []
  );

  const handleRenameConfirm = useCallback(
    (sectorId: string) => {
      if (confirmingId === sectorId) {
        // Second click — apply
        renameSector(sectorId, renameValue.trim() || "Sin nombre");
        setRenamingId(null);
        setConfirmingId(null);
      } else {
        // First click — ask confirmation
        setConfirmingId(sectorId);
      }
    },
    [confirmingId, renameSector, renameValue]
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
    setConfirmingId(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, sectorId: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRenameConfirm(sectorId);
      }
      if (e.key === "Escape") {
        handleRenameCancel();
      }
    },
    [handleRenameConfirm, handleRenameCancel]
  );

  return (
    <div className="sector-map">
      <ThemeToggle />
      <h1 className="sector-map-title">Mapa Cognitivo</h1>
      <p className="sector-map-subtitle">Selecciona un sector para explorar tus creencias</p>
      <div className="sector-grid">
        {sectors.map((sector) => (
          <div
            key={sector.id}
            className="sector-card"
            onClick={() => handleClick(sector.id)}
          >
            <span className="sector-emoji">{sector.emoji}</span>
            {renamingId === sector.id ? (
              <div className="sector-rename" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={renamingId === sector.id ? inputRef : undefined}
                  className="sector-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, sector.id)}
                />
                <div className="sector-rename-actions">
                  <button
                    className="sector-rename-btn confirm"
                    onClick={() => handleRenameConfirm(sector.id)}
                  >
                    {confirmingId === sector.id ? "Confirmar" : "Renombrar"}
                  </button>
                  <button
                    className="sector-rename-btn cancel"
                    onClick={handleRenameCancel}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <span
                className="sector-name"
                onDoubleClick={(e) => handleDoubleClick(e, sector.id, sector.name)}
              >
                {sector.name}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
