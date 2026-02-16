"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Edge,
  type Node,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useFlowStore } from "../store";
import CircleNode from "./CircleNode";
import ThemeToggle from "./ThemeToggle";
import Breadcrumb from "./Breadcrumb";

const nodeTypes = { circle: CircleNode };

function Flow() {
  const currentView = useFlowStore((s) => s.currentView);
  const sectorCanvases = useFlowStore((s) => s.sectorCanvases);
  const navigateTo = useFlowStore((s) => s.navigateTo);
  const { screenToFlowPosition } = useReactFlow();

  const sectorId = currentView.view === "canvas" ? currentView.sectorId : null;
  const canvas = sectorId
    ? sectorCanvases[sectorId] || { nodes: [], edges: [] }
    : { nodes: [], edges: [] };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => useFlowStore.getState().onNodesChange(changes),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => useFlowStore.getState().onEdgesChange(changes),
    []
  );
  const onConnect: OnConnect = useCallback(
    (connection) => useFlowStore.getState().onConnect(connection),
    []
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      useFlowStore.getState().addNode(position);
    },
    [screenToFlowPosition]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      useFlowStore.getState().deleteEdge(edge.id);
    },
    []
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!sectorId) return;
      navigateTo({ view: "detail", sectorId, nodeId: node.id });
    },
    [sectorId, navigateTo]
  );

  const defaultEdgeOptions = useMemo(
    () => ({ type: "default" as const, animated: true }),
    []
  );

  return (
    <ReactFlow
      nodes={canvas.nodes}
      edges={canvas.edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onEdgeClick={onEdgeClick}
      onNodeClick={onNodeClick}
      onPaneContextMenu={onPaneContextMenu}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      deleteKeyCode={["Backspace", "Delete"]}
    >
      <Background />
      <Controls />
      <MiniMap
        nodeColor={() => "#6366f1"}
        nodeStrokeWidth={2}
        nodeBorderRadius={50}
      />
    </ReactFlow>
  );
}

export default function FlowCanvas() {
  const darkMode = useFlowStore((s) => s.darkMode);

  return (
    <div data-theme={darkMode ? "dark" : "light"} style={{ width: "100vw", height: "100vh" }}>
      <ReactFlowProvider>
        <Flow />
        <Breadcrumb />
        <ThemeToggle />
      </ReactFlowProvider>
    </div>
  );
}
