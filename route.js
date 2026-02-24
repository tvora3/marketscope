export async function POST(request) {
  const { step, companyName, websiteUrl, previousData } = await request.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured. Add it in Vercel Environment Variables." }, { status: 500 });
  }

  async function callClaude(systemPrompt, userPrompt) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "Claude API error");
    return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  }

  function parseJSON(text) {
    const m = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (m) { try { return JSON.parse(m[1].trim()); } catch (e) { /* */ } }
    return null;
  }

  try {
    if (step === "competitors") {
      const raw = await callClaude(
        "You are a market research analyst with web search. ALWAYS search the web for real data. Return ONLY valid JSON, no markdown backticks, no explanation before or after the JSON.",
        `Research "${companyName}" (${websiteUrl}).

Search for "${companyName} competitors", "${companyName} vs", "${companyName} alternatives", and "${companyName} market share".

Return ONLY this JSON:
{"company_description":"one sentence about what they do","category":"their specific market category (e.g. CRM Software, Observability & APM, Design Collaboration)","competitors":[{"name":"CompetitorName","description":"one sentence","estimated_revenue_millions":number_or_null,"estimated_employees":number_or_null,"type":"direct|adjacent|emerging","key_differentiator":"one sentence"}]}

Include 6-10 REAL competitors. Use actual company names. Estimate revenue from public data, funding rounds, and employee counts. If revenue is unknown, estimate based on SaaS revenue-per-employee ratios ($150K-$350K/employee).`
      );
      const result = parseJSON(raw);
      if (!result?.competitors) return Response.json({ error: "Failed to identify competitors. Try again." }, { status: 422 });
      return Response.json(result);
    }

    if (step === "market") {
      const { category, competitors } = previousData;
      const cl = competitors.map(c => c.name).join(", ");
      const raw = await callClaude(
        "You are a B2B SaaS market sizing analyst with web search. ALWAYS search for real data before estimating. Return ONLY valid JSON, no markdown backticks.",
        `Research the "${category}" market where "${companyName}" competes against: ${cl}.

Search for: "${category} market size 2024 2025", "${category} market growth CAGR", "${companyName} pricing", "${competitors[0]?.name || ''} market share ${category}".

Return ONLY this JSON:
{"tam_billions":number,"tam_source":"where you found this","sam_billions":number,"som_billions":number,"growth_rate_pct":number,"growth_source":"source","market_penetration_pct":number,"penetration_reasoning":"brief explanation","acv":{"smb":{"low":number,"mid":number,"high":number},"mid_market":{"low":number,"mid":number,"high":number},"enterprise":{"low":number,"mid":number,"high":number},"pricing_notes":"what you found about actual pricing"},"competitor_shares":[{"name":"CompanyName","estimated_share_pct":number,"share_reasoning":"brief basis"}],"market_dynamics":{"top3_combined_share_pct":number,"switching_cost_1to5":number,"regulatory_barrier_1to5":number,"key_trend":"one sentence"}}

All monetary values in USD. Use real numbers from research.`
      );
      const result = parseJSON(raw);
      if (!result) return Response.json({ error: "Failed to gather market data. Try again." }, { status: 422 });
      return Response.json(result);
    }

    if (step === "strategy") {
      const raw = await callClaude(
        "You are a senior strategy consultant at a top firm. Generate sharp, specific strategic insights grounded in data. Return ONLY valid JSON, no markdown backticks.",
        `Based on this market research for "${companyName}" in the "${previousData.category}" market:

${JSON.stringify(previousData)}

Return ONLY this JSON:
{"market_type":"consolidated|emerging|fragmented|land_grab|ripe_for_rollup","market_type_reasoning":"2-3 sentences explaining why","share_dynamics":"2-3 sentences on whether larger players have taken share or if it's still up for grabs","key_insights":["Specific insight 1 with numbers","Specific insight 2 with numbers","Specific insight 3 with numbers","Specific insight 4 with numbers"],"risks":["Specific risk 1","Specific risk 2","Specific risk 3"],"opportunity_scores":{"market_attractiveness":number_1_to_100,"competitive_intensity":number_1_to_100,"entry_feasibility":number_1_to_100,"timing_score":number_1_to_100}}

Be specific. Reference actual company names and real numbers. No generic statements.`
      );
      const result = parseJSON(raw);
      if (!result) return Response.json({ error: "Failed to generate strategic analysis. Try again." }, { status: 422 });
      return Response.json(result);
    }

    return Response.json({ error: "Invalid step" }, { status: 400 });
  } catch (err) {
    console.error("Analysis error:", err);
    return Response.json({ error: err.message || "Analysis failed" }, { status: 500 });
  }
}
