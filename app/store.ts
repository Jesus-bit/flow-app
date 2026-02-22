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
import { persist, createJSONStorage } from "zustand/middleware";
import { syncStorage, registerRehydrate } from "@/lib/sync-storage";

// ── Types ──

export type CustomEmoji = {
  id: string;
  name: string;
  svg: string; // data URL
};

export type Sector = {
  id: string;
  name: string;
  emoji: string;
  position: { x: number; y: number };
};

export type SectorCanvas = {
  nodes: Node[];
  edges: Edge[];
};

export type BeliefType = "belief" | "hypothesis" | "value" | "rule" | "observation";
export type BeliefImpact = "bajo" | "medio" | "alto";
export type BeliefEmotion =
  | "miedo" | "seguridad" | "culpa" | "orgullo"
  | "deseo" | "tristeza" | "enojo" | "neutral";
export type BeliefOrigin =
  | "experiencia personal" | "familia" | "cultura" | "educacion"
  | "lectura" | "observacion" | "intuicion" | "otro";

export type BeliefDetail = {
  title: string;
  content: string;
  type: BeliefType;
  confidence: number;
  impact: BeliefImpact;
  emotion: BeliefEmotion;
  origin: BeliefOrigin;
  originOther: string;
  justification: string;
  context: string;
  // Inquiry fields
  description: string;
  q1_true: "si" | "no" | "";
  q2_absolute: "si" | "no" | "";
  q3_emotions: string;
  q3_images: string;
  q3_behavior: string;
  q4_identity: string;
  q4_experience: string;
  turnarounds: string;
};

export type ViewState =
  | { view: "sectors" }
  | { view: "canvas"; sectorId: string }
  | { view: "detail"; sectorId: string; nodeId: string };

// ── Default Sectors ──

const DEFAULT_SECTORS: Sector[] = [
  { id: "identidad", name: "Identidad", emoji: "🪞", position: { x: 0, y: 0 } },
  { id: "cuerpo", name: "Cuerpo", emoji: "🏋️", position: { x: 1, y: 0 } },
  { id: "mente", name: "Mente", emoji: "🧠", position: { x: 2, y: 0 } },
  { id: "emociones", name: "Emociones", emoji: "💜", position: { x: 3, y: 0 } },
  { id: "relaciones", name: "Relaciones", emoji: "🤝", position: { x: 0, y: 1 } },
  { id: "dinero", name: "Dinero", emoji: "💰", position: { x: 1, y: 1 } },
  { id: "trabajo", name: "Trabajo", emoji: "💼", position: { x: 2, y: 1 } },
  { id: "sociedad", name: "Sociedad", emoji: "🌐", position: { x: 3, y: 1 } },
  { id: "espiritualidad", name: "Espiritualidad", emoji: "✨", position: { x: 0, y: 2 } },
  { id: "tiempo", name: "Tiempo", emoji: "⏳", position: { x: 1, y: 2 } },
  { id: "libertad", name: "Libertad/Control", emoji: "🔓", position: { x: 2, y: 2 } },
  { id: "placer", name: "Placer", emoji: "🎭", position: { x: 3, y: 2 } },
  { id: "seguridad", name: "Seguridad", emoji: "🛡️", position: { x: 0, y: 3 } },
];

// ── Store Type ──

export type FlowState = {
  // Data
  sectors: Sector[];
  sectorCanvases: Record<string, SectorCanvas>;
  beliefDetails: Record<string, BeliefDetail>;
  customEmojis: CustomEmoji[];
  darkMode: boolean;
  _lastModified: number;

  // Navigation (no persistido)
  currentView: ViewState;
  navigateTo: (view: ViewState) => void;

  // Sector actions
  renameSector: (id: string, name: string) => void;
  moveSector: (id: string, position: { x: number; y: number }) => void;

  // Canvas actions (operate on current sector)
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (position: { x: number; y: number }) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  deleteEdge: (edgeId: string) => void;

  // Belief detail actions
  updateBeliefDetail: (nodeId: string, detail: Partial<BeliefDetail>) => void;

  // Global actions
  toggleDarkMode: () => void;
  addCustomEmoji: (emoji: CustomEmoji) => void;
  removeCustomEmoji: (emojiId: string) => void;
};

// ── Helpers ──

let nodeIdCounter = 0;

function getNextId() {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

function getCurrentSectorId(state: FlowState): string | null {
  if (state.currentView.view === "canvas") return state.currentView.sectorId;
  if (state.currentView.view === "detail") return state.currentView.sectorId;
  return null;
}

function getSectorCanvas(state: FlowState, sectorId: string): SectorCanvas {
  return state.sectorCanvases[sectorId] || { nodes: [], edges: [] };
}

function updateSectorCanvas(
  state: FlowState,
  sectorId: string,
  updater: (canvas: SectorCanvas) => SectorCanvas
): Partial<FlowState> {
  const current = getSectorCanvas(state, sectorId);
  return {
    sectorCanvases: {
      ...state.sectorCanvases,
      [sectorId]: updater(current),
    },
    _lastModified: Date.now(),
  };
}

// ── Store ──

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      // Data
      sectors: DEFAULT_SECTORS,
      sectorCanvases: {},
      beliefDetails: {},
      customEmojis: [],
      darkMode: true,
      _lastModified: 0,

      // Navigation
      currentView: { view: "sectors" } as ViewState,
      navigateTo: (view: ViewState) => set({ currentView: view }),

      // Sector actions
      renameSector: (id: string, name: string) => {
        set({
          sectors: get().sectors.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
          _lastModified: Date.now(),
        });
      },
      moveSector: (id: string, position: { x: number; y: number }) => {
        set({
          sectors: get().sectors.map((s) =>
            s.id === id ? { ...s, position } : s
          ),
          _lastModified: Date.now(),
        });
      },

      // Canvas actions
      onNodesChange: (changes: NodeChange[]) => {
        const state = get();
        const sectorId = getCurrentSectorId(state);
        if (!sectorId) return;
        set(
          updateSectorCanvas(state, sectorId, (canvas) => ({
            ...canvas,
            nodes: applyNodeChanges(changes, canvas.nodes),
          }))
        );
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        const state = get();
        const sectorId = getCurrentSectorId(state);
        if (!sectorId) return;
        set(
          updateSectorCanvas(state, sectorId, (canvas) => ({
            ...canvas,
            edges: applyEdgeChanges(changes, canvas.edges),
          }))
        );
      },
      onConnect: (connection: Connection) => {
        const state = get();
        const sectorId = getCurrentSectorId(state);
        if (!sectorId) return;
        set(
          updateSectorCanvas(state, sectorId, (canvas) => ({
            ...canvas,
            edges: addEdge(connection, canvas.edges),
          }))
        );
      },
      addNode: (position: { x: number; y: number }) => {
        const state = get();
        const sectorId = getCurrentSectorId(state);
        if (!sectorId) return;
        const newNode: Node = {
          id: getNextId(),
          type: "circle",
          position,
          data: { label: "" },
        };
        set(
          updateSectorCanvas(state, sectorId, (canvas) => ({
            ...canvas,
            nodes: [...canvas.nodes, newNode],
          }))
        );
      },
      updateNodeLabel: (nodeId: string, label: string) => {
        const state = get();
        const sectorId = getCurrentSectorId(state);
        if (!sectorId) return;
        set({
          ...updateSectorCanvas(state, sectorId, (canvas) => ({
            ...canvas,
            nodes: canvas.nodes.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
            ),
          })),
          beliefDetails: {
            ...state.beliefDetails,
            ...(state.beliefDetails[nodeId]
              ? { [nodeId]: { ...state.beliefDetails[nodeId], title: label } }
              : {}),
          },
          _lastModified: Date.now(),
        });
      },
      deleteEdge: (edgeId: string) => {
        const state = get();
        const sectorId = getCurrentSectorId(state);
        if (!sectorId) return;
        set(
          updateSectorCanvas(state, sectorId, (canvas) => ({
            ...canvas,
            edges: canvas.edges.filter((e) => e.id !== edgeId),
          }))
        );
      },

      // Belief detail actions
      updateBeliefDetail: (nodeId: string, detail: Partial<BeliefDetail>) => {
        const state = get();
        const existing = state.beliefDetails[nodeId] || {
          title: "",
          content: "",
          type: "belief" as BeliefType,
          confidence: 0.5,
          impact: "medio" as BeliefImpact,
          emotion: "neutral" as BeliefEmotion,
          origin: "experiencia personal" as BeliefOrigin,
          originOther: "",
          justification: "",
          context: "",
          description: "",
          q1_true: "" as const,
          q2_absolute: "" as const,
          q3_emotions: "",
          q3_images: "",
          q3_behavior: "",
          q4_identity: "",
          q4_experience: "",
          turnarounds: "",
        };
        const updated = { ...existing, ...detail };
        set({
          beliefDetails: { ...state.beliefDetails, [nodeId]: updated },
          _lastModified: Date.now(),
        });

        // If title changed, also update node label in canvas
        if (detail.title !== undefined) {
          const sectorId = getCurrentSectorId(state);
          if (sectorId) {
            set(
              updateSectorCanvas(state, sectorId, (canvas) => ({
                ...canvas,
                nodes: canvas.nodes.map((n) =>
                  n.id === nodeId
                    ? { ...n, data: { ...n.data, label: detail.title } }
                    : n
                ),
              }))
            );
          }
        }
      },

      // Global actions
      toggleDarkMode: () =>
        set({ darkMode: !get().darkMode, _lastModified: Date.now() }),
      addCustomEmoji: (emoji: CustomEmoji) => {
        set({ customEmojis: [...get().customEmojis, emoji], _lastModified: Date.now() });
      },
      removeCustomEmoji: (emojiId: string) => {
        set({
          customEmojis: get().customEmojis.filter((e) => e.id !== emojiId),
          _lastModified: Date.now(),
        });
      },
    }),
    {
      name: "flow-storage",
      storage: createJSONStorage(() => syncStorage),
      version: 6,
      migrate: (persisted: unknown, version: number) => {
        if (version < 4) {
          const old = persisted as {
            nodes?: Node[];
            edges?: Edge[];
            customEmojis?: CustomEmoji[];
            darkMode?: boolean;
          };
          const sectorCanvases: Record<string, SectorCanvas> = {};
          if (old.nodes?.length || old.edges?.length) {
            sectorCanvases["mente"] = {
              nodes: old.nodes || [],
              edges: old.edges || [],
            };
          }
          return {
            sectors: DEFAULT_SECTORS,
            sectorCanvases,
            beliefDetails: {},
            customEmojis: old.customEmojis || [],
            darkMode: old.darkMode ?? true,
            currentView: { view: "sectors" },
            _lastModified: 0,
          };
        }
        if (version === 4) {
          const old = persisted as Record<string, unknown>;
          const oldDetails = (old.beliefDetails || {}) as Record<string, Record<string, unknown>>;
          const newDetails: Record<string, BeliefDetail> = {};
          for (const [id, detail] of Object.entries(oldDetails)) {
            newDetails[id] = {
              title: (detail.title as string) || "",
              content: (detail.description as string) || (detail.content as string) || "",
              type: "belief",
              confidence: 0.5,
              impact: "medio",
              emotion: "neutral",
              origin: "experiencia personal",
              originOther: "",
              justification: "",
              context: "",
              description: "",
              q1_true: "",
              q2_absolute: "",
              q3_emotions: "",
              q3_images: "",
              q3_behavior: "",
              q4_identity: "",
              q4_experience: "",
              turnarounds: "",
            };
          }
          return { ...old, beliefDetails: newDetails, _lastModified: 0 };
        }
        if (version === 5) {
          const old = persisted as Record<string, unknown>;
          const oldDetails = (old.beliefDetails || {}) as Record<string, Record<string, unknown>>;
          const newDetails: Record<string, unknown> = {};
          for (const [id, detail] of Object.entries(oldDetails)) {
            newDetails[id] = {
              ...detail,
              description: detail.description || "",
              q1_true: detail.q1_true || "",
              q2_absolute: detail.q2_absolute || "",
              q3_emotions: detail.q3_emotions || "",
              q3_images: detail.q3_images || "",
              q3_behavior: detail.q3_behavior || "",
              q4_identity: detail.q4_identity || "",
              q4_experience: detail.q4_experience || "",
              turnarounds: detail.turnarounds || "",
            };
          }
          return { ...old, beliefDetails: newDetails, _lastModified: 0 };
        }
        return persisted as Record<string, unknown>;
      },
      partialize: (state) => ({
        sectors: state.sectors,
        sectorCanvases: state.sectorCanvases,
        beliefDetails: state.beliefDetails,
        customEmojis: state.customEmojis,
        darkMode: state.darkMode,
        _lastModified: state._lastModified,
      }),
    }
  )
);

// Registrar callback de rehidratación para sync-storage
if (typeof window !== "undefined") {
  registerRehydrate("flow-storage", () => {
    void useFlowStore.persist.rehydrate();
  });
}
