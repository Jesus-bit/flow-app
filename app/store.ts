import {
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
} from "@xyflow/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomEmoji = {
  id: string;
  name: string;
  svg: string; // data URL
};

export type FlowState = {
  nodes: Node[];
  edges: Edge[];
  customEmojis: CustomEmoji[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (position: { x: number; y: number }) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  deleteEdge: (edgeId: string) => void;
  addCustomEmoji: (emoji: CustomEmoji) => void;
  removeCustomEmoji: (emojiId: string) => void;
};

let nodeIdCounter = 0;

function getNextId() {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      customEmojis: [],
      onNodesChange: (changes: NodeChange[]) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      },
      onConnect: (connection: Connection) => {
        set({ edges: addEdge(connection, get().edges) });
      },
      addNode: (position: { x: number; y: number }) => {
        const newNode: Node = {
          id: getNextId(),
          type: "circle",
          position,
          data: { label: "" },
        };
        set({ nodes: [...get().nodes, newNode] });
      },
      updateNodeLabel: (nodeId: string, label: string) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
          ),
        });
      },
      deleteEdge: (edgeId: string) => {
        set({ edges: get().edges.filter((e) => e.id !== edgeId) });
      },
      addCustomEmoji: (emoji: CustomEmoji) => {
        set({ customEmojis: [...get().customEmojis, emoji] });
      },
      removeCustomEmoji: (emojiId: string) => {
        set({
          customEmojis: get().customEmojis.filter((e) => e.id !== emojiId),
        });
      },
    }),
    {
      name: "flow-storage",
      version: 2,
      migrate: () => ({
        nodes: [],
        edges: [],
        customEmojis: [],
      }),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        customEmojis: state.customEmojis,
      }),
    }
  )
);
