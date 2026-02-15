"use client";

import { useFlowStore } from "../store";

export default function ThemeToggle() {
  const darkMode = useFlowStore((s) => s.darkMode);

  return (
    <button
      className="theme-toggle"
      onClick={() => useFlowStore.getState().toggleDarkMode()}
      title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {darkMode ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
