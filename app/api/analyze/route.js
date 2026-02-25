import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = "claude-3-haiku-latest";

async function callClaudeJSON(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1400,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Anthropic request failed");
  }

  const text = data?.content?.[0]?.text || "";
  // Extract first JSON object from the model output
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return JSON");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req) {
  try {
    const { step, companyName, websiteUrl, previousData } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    if (!companyName || !websiteUrl) {
      return NextResponse.json({ error: "Missing companyName or websiteUrl" }, { status: 400 });
    }

    // STEP 1: Competitors + category + company description
    if (step === "competitors") {
      const out = await callClaudeJSON(
        "You are a market research analyst. Return ONLY valid JSON. No markdown.",
        `Company: ${companyName}
Website: ${websiteUrl}

Return JSON with this exact shape:
{
  "category": "short market category",
  "company_description": "one sentence",
  "competitors": [
    {
      "name": "string",
      "description": "string",
      "type": "direct|emerging|adjacent",
      "estimated_revenue_millions": number|null,
      "estimated_employees": number|null,
      "key_differentiator": "string"
    }
  ]
}

Rules:
- competitors must be an array (8-12 items)
- use null if unknown
`
      );

      return NextResponse.json({
        category: out?.category ?? null,
        company_description: out?.company_description ?? null,
        competitors: Array.isArray(out?.competitors) ? out.competitors : [],
      });
    }

    // STEP 2: Market sizing + growth + penetration + acv + dynamics + competitor shares
    if (step === "market") {
      const out = await callClaudeJSON(
        "You are a market sizing analyst. Return ONLY valid JSON. No markdown.",
        `Company: ${companyName}
Website: ${websiteUrl}
Category: ${previousData?.category || ""}

Known competitors (may be empty):
${JSON.stringify(previousData?.competitors || []).slice(0, 4000)}

Return JSON with this exact shape:
{
  "tam_billions": number|null,
  "tam_source": "string|null",
  "sam_billions": number|null,
  "som_billions": number|null,
  "growth_rate_pct": number|null,
  "growth_source": "string|null",
  "market_penetration_pct": number|null,
  "penetration_reasoning": "string|null",
  "competitor_shares": [
    { "name": "string", "estimated_share_pct": number|null }
  ],
  "acv": {
    "smb": { "low": number|null, "mid": number|null, "high": number|null },
    "mid_market": { "low": number|null, "mid": number|null, "high": number|null },
    "enterprise": { "low": number|null, "mid": number|null, "high": number|null },
    "pricing_notes": "string|null"
  },
  "market_dynamics": {
    "switching_cost_1to5": number|null,
    "regulatory_barrier_1to5": number|null,
    "key_trend": "string|null"
  }
}

Rules:
- all numeric fields are numbers or null
- competitor_shares must be an array (can be empty)
`
      );

      return NextResponse.json({
        tam_billions: out?.tam_billions ?? null,
        tam_source: out?.tam_source ?? null,
        sam_billions: out?.sam_billions ?? null,
        som_billions: out?.som_billions ?? null,
        growth_rate_pct: out?.growth_rate_pct ?? null,
        growth_source: out?.growth_source ?? null,
        market_penetration_pct: out?.market_penetration_pct ?? null,
        penetration_reasoning: out?.penetration_reasoning ?? null,
        competitor_shares: Array.isArray(out?.competitor_shares) ? out.competitor_shares : [],
        acv: out?.acv ?? null,
        market_dynamics: out?.market_dynamics ?? null,
      });
    }

    // STEP 3: Strategy + market type + insights + risks + opportunity scores
    if (step === "strategy") {
      const out = await callClaudeJSON(
        "You are a strategy analyst. Return ONLY valid JSON. No markdown.",
        `Company: ${companyName}
Website: ${websiteUrl}

Context JSON:
${JSON.stringify(previousData || {}).slice(0, 6000)}

Return JSON with this exact shape:
{
  "market_type": "consolidated|emerging|fragmented|land_grab|ripe_for_rollup",
  "market_type_reasoning": "string",
  "share_dynamics": "string",
  "key_insights": ["string"],
  "risks": ["string"],
  "opportunity_scores": {
    "market_attractiveness": number,
    "competitive_intensity": number,
    "entry_feasibility": number,
    "timing_score": number
  }
}

Rules:
- key_insights and risks must be arrays (3-6 items)
- opportunity scores are 0-100 integers
`
      );

      return NextResponse.json({
        market_type: out?.market_type ?? "fragmented",
        market_type_reasoning: out?.market_type_reasoning ?? null,
        share_dynamics: out?.share_dynamics ?? null,
        key_insights: Array.isArray(out?.key_insights) ? out.key_insights : [],
        risks: Array.isArray(out?.risks) ? out.risks : [],
        opportunity_scores: out?.opportunity_scores ?? {},
      });
    }

    return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}



