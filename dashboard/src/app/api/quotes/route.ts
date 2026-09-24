import { NextRequest, NextResponse } from "next/server";
import { getQuotes } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const body = await getQuotes(symbolsParam.split(","));
  return NextResponse.json(body);
}
