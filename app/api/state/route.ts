import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type StoreRow = {
  key: string;
  value: string;
  updated_at: number;
};

function authenticate(req: NextRequest): boolean {
  const apiSecret = process.env.API_SECRET;
  if (!apiSecret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${apiSecret}`) return true;

  // También acepta la cookie auth-token para llamadas desde el browser
  const cookieToken = req.cookies.get("auth-token")?.value;
  return cookieToken === apiSecret;
}

export function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    const row = getDb()
      .prepare("SELECT value, updated_at FROM store WHERE key = ?")
      .get(key) as StoreRow | undefined;

    if (!row) {
      return NextResponse.json({ data: null }, { status: 404 });
    }

    return NextResponse.json({
      data: JSON.parse(row.value) as unknown,
      updated_at: row.updated_at,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { key?: string; value?: unknown };
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    getDb()
      .prepare(
        `INSERT INTO store (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), Date.now());

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export function DELETE(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    getDb().prepare("DELETE FROM store WHERE key = ?").run(key);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
