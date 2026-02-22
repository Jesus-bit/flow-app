import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const apiSecret = process.env.API_SECRET;

  // Sin secret configurado: no hay protección (útil en dev sin .env.local)
  if (!apiSecret) {
    return NextResponse.next();
  }

  // Siempre permitir: health check
  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  // Rutas de API → validar Authorization header O cookie auth-token
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("auth-token")?.value;

    const authorized =
      authHeader === `Bearer ${apiSecret}` || cookieToken === apiSecret;

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Login page: siempre accesible
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Resto de rutas: validar cookie auth-token
  const cookieToken = request.cookies.get("auth-token")?.value;
  if (cookieToken !== apiSecret) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Excluir archivos estáticos de Next.js, service worker, manifest e iconos.
     * Procesar todo lo demás.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-|manifest.json|icons/).*)",
  ],
};
