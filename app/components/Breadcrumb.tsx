"use client";

import { useFlowStore } from "../store";

export default function Breadcrumb() {
  const currentView = useFlowStore((s) => s.currentView);
  const sectors = useFlowStore((s) => s.sectors);
  const beliefDetails = useFlowStore((s) => s.beliefDetails);
  const sectorCanvases = useFlowStore((s) => s.sectorCanvases);
  const navigateTo = useFlowStore((s) => s.navigateTo);

  if (currentView.view === "sectors") return null;

  const sectorId =
    currentView.view === "canvas"
      ? currentView.sectorId
      : currentView.sectorId;
  const sector = sectors.find((s) => s.id === sectorId);
  const sectorLabel = sector ? `${sector.emoji} ${sector.name}` : sectorId;

  let beliefLabel: string | null = null;
  if (currentView.view === "detail") {
    const { nodeId } = currentView;
    const detail = beliefDetails[nodeId];
    if (detail?.title) {
      beliefLabel = detail.title;
    } else {
      const canvas = sectorCanvases[sectorId] || { nodes: [] };
      const node = canvas.nodes.find((n) => n.id === nodeId);
      beliefLabel = (node?.data?.label as string) || "Sin nombre";
    }
  }

  return (
    <nav className="breadcrumb">
      <button
        className="breadcrumb-item"
        onClick={() => navigateTo({ view: "sectors" })}
      >
        Sectores
      </button>
      <span className="breadcrumb-sep">&gt;</span>
      {currentView.view === "canvas" ? (
        <span className="breadcrumb-current">{sectorLabel}</span>
      ) : (
        <button
          className="breadcrumb-item"
          onClick={() => navigateTo({ view: "canvas", sectorId })}
        >
          {sectorLabel}
        </button>
      )}
      {beliefLabel && (
        <>
          <span className="breadcrumb-sep">&gt;</span>
          <span className="breadcrumb-current">{beliefLabel}</span>
        </>
      )}
    </nav>
  );
}
