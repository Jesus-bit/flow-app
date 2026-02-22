import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // En desarrollo no activar el SW para no interferir con HMR
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Necesario para el Dockerfile con CMD ["node", "server.js"]
  output: "standalone",

  // better-sqlite3 es un módulo nativo; no debe ser bundleado
  serverExternalPackages: ["better-sqlite3"],

  // Declarar turbopack vacío para silenciar warning de webpack config heredado de serwist
  turbopack: {},
};

export default withSerwist(nextConfig);
