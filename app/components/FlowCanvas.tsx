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
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useFlowStore } from "../store";
import CircleNode from "./CircleNode";

const nodeTypes = { circle: CircleNode };

function Flow() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const { screenToFlowPosition } = useReactFlow();

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

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      useFlowStore.getState().addNode(position);
    },
    [screenToFlowPosition]
  );

  const defaultEdgeOptions = useMemo(
    () => ({ type: "default" as const, animated: true }),
    []
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDoubleClick={onDoubleClick}
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
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}
