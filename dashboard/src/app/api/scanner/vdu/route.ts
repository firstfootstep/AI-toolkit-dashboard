import { NextResponse } from "next/server";
import { getVduScan } from "@/lib/vduScan";

export const dynamic = "force-dynamic";

const DEFAULT_EQUITY: Record<string, number> = { america: 100_000, thailand: 1_000_000 };
const FALLBACK_EQUITY = 1_000_000;

// The Scanner page's "VDU" tab. Unlike the other scan presets (instant,
// client-side thresholds over data already loaded), this needs daily bars per
// symbol, so it's an on-demand server scan triggered by a button — see
// src/lib/vduScan.ts. No mock fallback: a VDU signal on fake bars would be
// meaningless, so a failure is an honest error, not a degraded table.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") ?? "america";
  const equityParam = Number(searchParams.get("equity"));
  const equity = Number.isFinite(equityParam) && equityParam > 0 ? equityParam : (DEFAULT_EQUITY[market] ?? FALLBACK_EQUITY);

  try {
    const result = await getVduScan(market, equity);
    return NextResponse.json({ result, equity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "VDU scan failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
