import type { Metadata, Viewport } from "next";
import "./globals.css";
import SyncStatus from "@/components/sync-status";

export const metadata: Metadata = {
  title: "Flow App",
  description: "Mapa visual de creencias",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flow App",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        {children}
        <SyncStatus />
      </body>
    </html>
  );
}
