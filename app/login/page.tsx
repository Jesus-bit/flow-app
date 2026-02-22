"use client";

import { useState } from "react";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      setError("Ingresa un token de acceso");
      return;
    }
    // Guardar token como cookie accesible desde JS con maxAge 365 días
    document.cookie = `auth-token=${encodeURIComponent(token.trim())}; max-age=${
      365 * 24 * 60 * 60
    }; path=/; SameSite=Lax`;
    window.location.href = "/";
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "320px",
          padding: "2rem",
          background: "#111",
          borderRadius: "12px",
          border: "1px solid #333",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#8b5cf6" }}>
          Flow App
        </h1>
        <p style={{ margin: 0, color: "#aaa", fontSize: "0.9rem" }}>
          Ingresa tu token de acceso para continuar.
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setError("");
          }}
          placeholder="Token de acceso"
          autoComplete="current-password"
          style={{
            padding: "0.6rem 0.8rem",
            fontSize: "1rem",
            background: "#222",
            border: "1px solid #444",
            borderRadius: "6px",
            color: "#fff",
            outline: "none",
          }}
        />
        {error && (
          <p style={{ margin: 0, color: "#ef4444", fontSize: "0.85rem" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          style={{
            padding: "0.6rem 1rem",
            background: "#8b5cf6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Acceder
        </button>
      </form>
    </div>
  );
}
