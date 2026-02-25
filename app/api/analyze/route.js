import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { step, companyName, websiteUrl, previousData } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    // Temporary test response (so we confirm routing works)
    return NextResponse.json({
      success: true,
      step,
      companyName,
      websiteUrl,
      message: "API route is working"
    });

  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}