import { NextResponse } from "next/server";
import { getNews } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = await getNews();
  return NextResponse.json(body);
}
