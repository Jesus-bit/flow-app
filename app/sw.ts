import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, CacheFirst, ExpirationPlugin } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // NetworkFirst para rutas de API
    {
      matcher: /^\/api\//,
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60, // 1 hora
          }),
        ],
      }),
    },
    // CacheFirst para assets estáticos
    {
      matcher: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/i,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
          }),
        ],
      }),
    },
    // Estrategias por defecto de @serwist/next
    ...defaultCache,
  ],
});

serwist.addEventListeners();
