import { NextResponse } from "next/server";
import { getExploreCocktails } from "@/lib/explore-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getExploreCocktails();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to fetch explore cocktails", error);
    return NextResponse.json(
      { error: "Failed to fetch explore cocktails" },
      { status: 500 },
    );
  }
}
