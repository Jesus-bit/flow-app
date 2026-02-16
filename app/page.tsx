"use client";

import { useFlowStore } from "./store";
import SectorMap from "./components/SectorMap";
import FlowCanvas from "./components/FlowCanvas";
import BeliefDetail from "./components/BeliefDetail";

export default function Home() {
  const currentView = useFlowStore((s) => s.currentView);
  const darkMode = useFlowStore((s) => s.darkMode);

  if (currentView.view === "canvas") {
    return <FlowCanvas />;
  }

  if (currentView.view === "detail") {
    return <BeliefDetail />;
  }

  return (
    <div data-theme={darkMode ? "dark" : "light"} style={{ width: "100vw", height: "100vh" }}>
      <SectorMap />
    </div>
  );
}
