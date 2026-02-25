"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const C = { bg:"#0A0E17",surface:"#111827",surfaceLight:"#1A2236",border:"#1E293B",accent:"#3B82F6",accentGlow:"rgba(59,130,246,0.15)",green:"#10B981",yellow:"#F59E0B",red:"#EF4444",purple:"#8B5CF6",orange:"#F97316",cyan:"#06B6D4",text:"#F1F5F9",textMuted:"#94A3B8",textDim:"#64748B" };
const MT = { consolidated:{label:"Consolidated",color:C.red,icon:"🏢",desc:"1–3 players dominate with >60% share"}, emerging:{label:"Emerging",color:C.cyan,icon:"🌱",desc:"Low penetration, category still forming"}, fragmented:{label:"Fragmented",color:C.yellow,icon:"🧩",desc:"Many players, no clear winner"}, land_grab:{label:"Land Grab",color:C.green,icon:"🚀",desc:"Fast growth, share is up for grabs"}, ripe_for_rollup:{label:"Ripe for Roll-Up",color:C.purple,icon:"🔗",desc:"PE consolidation opportunity"} };

// ─── Research Engine (calls our secure API route) ───
async function research(name, url, onStep) {
  async function call(step, previousData) {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, companyName: name, websiteUrl: url, previousData }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  onStep("step1");
  const s1 = await call("competitors");

  onStep("step2");
  const s2 = await call("market", { category: s1.category, competitors: s1.competitors });

  onStep("step3");
  const s3 = await call("strategy", { ...s1, ...s2, category: s1.category });

  onStep("step4");

  const comps = (Array.isArray(s1?.competitors) ? s1.competitors : []).map(comp => {
    const si = (s2.competitor_shares||[]).find(s => s.name.toLowerCase().includes(comp.name.toLowerCase()) || comp.name.toLowerCase().includes(s.name.toLowerCase()));
    const sh = si?.estimated_share_pct || (comp.estimated_revenue_millions && s2.tam_billions ? +(comp.estimated_revenue_millions/(s2.tam_billions*1000)*100).toFixed(1) : null);
    return { name:comp.name, description:comp.description, share:sh, revenue:comp.estimated_revenue_millions, employees:comp.estimated_employees, type:comp.type==="direct"?(sh&&sh>15?"Leader":sh&&sh>5?"Challenger":"Competitor"):comp.type==="emerging"?"Emerging":"Adjacent", differentiator:comp.key_differentiator };
  }).sort((a,b)=>(b.share||0)-(a.share||0));

  const hhi = comps.filter(c=>c.share).reduce((s,c)=>s+c.share*c.share,0);
  return { company:name, domain:url.replace(/https?:\/\//,"").replace(/\/$/,""), companyDescription:s1.company_description, category:s1.category, tam:s2.tam_billions, tamSource:s2.tam_source, sam:s2.sam_billions, som:s2.som_billions, growth:s2.growth_rate_pct, growthSource:s2.growth_source, penetration:s2.market_penetration_pct||35, penetrationReasoning:s2.penetration_reasoning, hhi:Math.round(hhi), fragmentation:Math.round(100-Math.min(hhi/100,100)), marketType:s3.market_type||"fragmented", marketTypeReasoning:s3.market_type_reasoning, shareDynamics:s3.share_dynamics, switchingCost:s2.market_dynamics?.switching_cost_1to5||3, regulatoryBarrier:s2.market_dynamics?.regulatory_barrier_1to5||2, keyTrend:s2.market_dynamics?.key_trend, competitors:comps, top3Share:Math.round(comps.slice(0,3).reduce((s,c)=>s+(c.share||0),0)), acv:{smb:{...s2.acv?.smb,confidence:.75},midMarket:{...s2.acv?.mid_market,confidence:.6},enterprise:{...s2.acv?.enterprise,confidence:.45},pricingNotes:s2.acv?.pricing_notes}, insights:s3.key_insights||[], risks:s3.risks||[], opp:s3.opportunity_scores||{}, date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) };
}

// ─── UI Components ───
function GC({children,style,glow}){return(<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:24,overflow:"hidden",boxShadow:glow?`0 0 40px ${C.accentGlow}`:"0 2px 12px rgba(0,0,0,0.3)",...style}}>{children}</div>)}
function Bdg({children,color=C.accent}){return(<span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,color,background:`${color}18`,border:`1px solid ${color}30`}}>{children}</span>)}
function CD({value}){const c=value>=.75?C.green:value>=.5?C.yellow:C.red;return(<span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,color:C.textMuted}}><span style={{width:8,height:8,borderRadius:"50%",background:c,boxShadow:`0 0 6px ${c}`}}/>{Math.round(value*100)}%</span>)}
function MB({value,max=100,color=C.accent,height=6}){return(<div style={{width:"100%",height,borderRadius:height,background:C.border,overflow:"hidden"}}><div style={{width:`${Math.min(value/max*100,100)}%`,height:"100%",borderRadius:height,background:`linear-gradient(90deg,${color},${color}cc)`,transition:"width 1.2s cubic-bezier(.16,1,.3,1)"}}/></div>)}
function MX({label,value,sub,color=C.text}){return(<div style={{textAlign:"center"}}><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{label}</div><div style={{fontSize:24,fontWeight:700,color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.1}}>{value}</div>{sub&&<div style={{fontSize:11,color:C.textMuted,marginTop:4,maxWidth:180,margin:"4px auto 0"}}>{sub}</div>}</div>)}

function Pyramid({tam,sam,som}){const f=n=>n==null?"N/A":n>=1000?`$${(n/1000).toFixed(1)}T`:n>=1?`$${n.toFixed(1)}B`:`$${(n*1000).toFixed(0)}M`;
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"8px 0"}}>{[{l:"TAM",v:tam,c:"#3B82F6",w:100},{l:"SAM",v:sam,c:"#8B5CF6",w:70},{l:"SOM",v:som,c:"#10B981",w:42}].map(x=>(<div key={x.l} style={{display:"flex",alignItems:"center",gap:12,width:"100%"}}><div style={{width:36,fontSize:11,fontWeight:700,color:x.c,textAlign:"right"}}>{x.l}</div><div style={{flex:1,display:"flex",justifyContent:"center"}}><div style={{width:`${x.w}%`,height:38,borderRadius:8,background:`${x.c}20`,border:`1.5px solid ${x.c}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:x.c,fontFamily:"'JetBrains Mono',monospace"}}>{f(x.v)}</div></div></div>))}</div>)}

function Gauge({marketType}){const ts=["consolidated","fragmented","ripe_for_rollup","land_grab","emerging"];const i=Math.max(ts.indexOf(marketType),0);const a=-90+(i/(ts.length-1))*180;const inf=MT[marketType]||MT.fragmented;
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><svg width="220" height="130" viewBox="0 0 220 130"><defs><linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={C.red}/><stop offset="25%" stopColor={C.yellow}/><stop offset="50%" stopColor={C.purple}/><stop offset="75%" stopColor={C.green}/><stop offset="100%" stopColor={C.cyan}/></linearGradient></defs><path d="M 20 120 A 90 90 0 0 1 200 120" fill="none" stroke={C.border} strokeWidth="16" strokeLinecap="round"/><path d="M 20 120 A 90 90 0 0 1 200 120" fill="none" stroke="url(#gg)" strokeWidth="16" strokeLinecap="round" opacity="0.6"/><g transform={`rotate(${a}, 110, 120)`}><line x1="110" y1="120" x2="110" y2="42" stroke={inf.color} strokeWidth="3" strokeLinecap="round"/><circle cx="110" cy="120" r="8" fill={inf.color}/><circle cx="110" cy="120" r="4" fill={C.bg}/></g></svg><div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:inf.color}}>{inf.icon} {inf.label}</div><div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{inf.desc}</div></div></div>)}

function CBars({competitors}){const v=competitors.filter(c=>c.share!=null&&c.share>0);if(!v.length)return<div style={{color:C.textDim,fontSize:13,padding:20,textAlign:"center"}}>Share estimates unavailable — see table below.</div>;const mx=Math.max(...v.map(c=>c.share));const tc={Leader:C.accent,Challenger:C.purple,Competitor:C.textMuted,Emerging:C.green,Adjacent:C.orange};
  return(<div style={{display:"flex",flexDirection:"column",gap:8}}>{v.slice(0,10).map((c,i)=>(<div key={c.name} style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:120,fontSize:12,fontWeight:500,color:C.text,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{flex:1,position:"relative",height:22,borderRadius:6,background:C.surfaceLight,overflow:"hidden"}}><div style={{width:`${(c.share/mx)*100}%`,height:"100%",borderRadius:6,background:`${tc[c.type]||C.accent}30`,border:`1px solid ${tc[c.type]||C.accent}50`,transition:"width 1s ease",transitionDelay:`${i*80}ms`}}/><span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:600,color:tc[c.type]||C.accent,fontFamily:"'JetBrains Mono',monospace"}}>{c.share}%</span></div><Bdg color={tc[c.type]||C.accent}>{c.type}</Bdg></div>))}</div>)}

function ACVChart({acv}){const f=n=>n==null?"?":n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n}`;const ss=[{k:"smb",l:"SMB",c:C.green,d:acv.smb},{k:"mm",l:"Mid-Market",c:C.accent,d:acv.midMarket},{k:"e",l:"Enterprise",c:C.purple,d:acv.enterprise}];const gm=Math.max(...ss.map(s=>s.d?.high||0));if(!gm)return<div style={{color:C.textDim,fontSize:13,padding:20,textAlign:"center"}}>ACV data unavailable</div>;
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>{ss.map(s=>{if(!s.d?.low||!s.d?.high)return null;const lp=(s.d.low/gm)*100,wp=((s.d.high-s.d.low)/gm)*100,mp=s.d.mid?((s.d.mid-s.d.low)/(s.d.high-s.d.low))*100:50;return(<div key={s.k}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:600,color:s.c}}>{s.l}</span><CD value={s.d.confidence||.5}/></div><div style={{position:"relative",height:24,background:C.surfaceLight,borderRadius:6,overflow:"hidden"}}><div style={{position:"absolute",left:`${lp}%`,width:`${Math.max(wp,2)}%`,height:"100%",background:`${s.c}25`,border:`1px solid ${s.c}40`,borderRadius:4}}><div style={{position:"absolute",left:`${mp}%`,top:0,bottom:0,width:2,background:s.c,boxShadow:`0 0 6px ${s.c}`}}/></div></div><div style={{display:"flex",justifyContent:"space-between",marginTop:2}}><span style={{fontSize:10,color:C.textDim}}>{f(s.d.low)}</span><span style={{fontSize:11,fontWeight:600,color:s.c}}>{f(s.d.mid)}</span><span style={{fontSize:10,color:C.textDim}}>{f(s.d.high)}</span></div></div>)})}</div>)}

// ─── Main App ───
export default function MarketScope() {
  const [view,setView]=useState("input");const [cn,setCn]=useState("");const [wu,setWu]=useState("");const [d,setD]=useState(null);const [ls,setLs]=useState("");const [err,setErr]=useState(null);const [tab,setTab]=useState("overview");const ir=useRef(null);
  const steps=[{id:"step1",t:"Researching company & competitors..."},{id:"step2",t:"Analyzing market size & pricing..."},{id:"step3",t:"Generating strategic analysis..."},{id:"step4",t:"Assembling dashboard..."}];
  useEffect(()=>{if(view==="input"&&ir.current)ir.current.focus()},[view]);

  const go=useCallback(async()=>{if(!cn.trim()||!wu.trim())return;setView("loading");setErr(null);setLs("step1");try{const r=await research(cn,wu,setLs);setD(r);setTab("overview");setView("dash")}catch(e){setErr(e.message);setView("input")}},[cn,wu]);
  const reset=()=>{setView("input");setD(null);setCn("");setWu("");setTab("overview");setErr(null)};

  // ═══ INPUT VIEW ═══
  if(view==="input"){return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{textAlign:"center",marginBottom:48,maxWidth:600}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}><div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#fff"}}>◎</div><span style={{fontSize:26,fontWeight:700,color:C.text}}>MarketScope</span></div>
      <h1 style={{fontSize:42,fontWeight:300,color:C.text,lineHeight:1.15,letterSpacing:-1,fontFamily:"'Instrument Serif',Georgia,serif"}}>Live market intelligence<br/><span style={{color:C.accent}}>powered by AI research</span></h1>
      <p style={{fontSize:15,color:C.textMuted,marginTop:16,lineHeight:1.6}}>Enter any company — we research real competitors, market sizing, pricing, and structure using AI with live web search.</p>
    </div>
    <GC glow style={{width:"100%",maxWidth:520,padding:32}}>
      {err&&<div style={{padding:"10px 14px",borderRadius:10,background:`${C.red}15`,border:`1px solid ${C.red}30`,color:C.red,fontSize:13,marginBottom:16}}>{err}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:C.textMuted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Company Name</label><input ref={ir} value={cn} onChange={e=>setCn(e.target.value)} placeholder="e.g. Notion, Datadog, Figma, Gong" style={{width:"100%",padding:"12px 16px",borderRadius:10,background:C.surfaceLight,border:`1.5px solid ${C.border}`,color:C.text,fontSize:15,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} onKeyDown={e=>e.key==="Enter"&&document.getElementById("ms-url")?.focus()}/></div>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:C.textMuted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Website URL</label><input id="ms-url" value={wu} onChange={e=>setWu(e.target.value)} placeholder="e.g. https://notion.so" style={{width:"100%",padding:"12px 16px",borderRadius:10,background:C.surfaceLight,border:`1.5px solid ${C.border}`,color:C.text,fontSize:15,fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
        <button onClick={go} disabled={!cn.trim()||!wu.trim()} style={{width:"100%",padding:"14px 24px",borderRadius:12,border:"none",background:cn.trim()&&wu.trim()?`linear-gradient(135deg,${C.accent},${C.purple})`:C.surfaceLight,color:cn.trim()&&wu.trim()?"#fff":C.textDim,fontSize:15,fontWeight:600,cursor:cn.trim()&&wu.trim()?"pointer":"not-allowed",boxShadow:cn.trim()&&wu.trim()?`0 4px 24px ${C.accent}40`:"none",marginTop:4}}>Analyze Market with AI →</button>
      </div>
    </GC>
    <div style={{display:"flex",gap:20,marginTop:40,flexWrap:"wrap",justifyContent:"center"}}>{["Live Web Research","Real Competitors","Actual Pricing","Market Sizing","Strategic Analysis"].map(f=>(<div key={f} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><span style={{color:C.green}}>✓</span> {f}</div>))}</div>
  </div>)}

  // ═══ LOADING VIEW ═══
  if(view==="loading"){return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <GC glow style={{width:"100%",maxWidth:520,padding:40}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:32}}>
      <div style={{position:"relative",width:80,height:80}}><div style={{position:"absolute",inset:0,border:`3px solid ${C.border}`,borderRadius:"50%"}}/><div style={{position:"absolute",inset:0,border:"3px solid transparent",borderTopColor:C.accent,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><div style={{position:"absolute",inset:8,border:"2px solid transparent",borderTopColor:C.purple,borderRadius:"50%",animation:"spin 1.5s linear infinite reverse"}}/></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:8}}>Researching Live Market Data...</div><div style={{fontSize:13,color:C.textMuted}}>Using AI + web search for real competitive intelligence</div></div>
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>{steps.map((s,i)=>{const cur=s.id===ls;const done=steps.findIndex(x=>x.id===ls)>i;return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderRadius:10,background:cur?C.accentGlow:"transparent",border:`1px solid ${cur?C.accent+"40":"transparent"}`}}><div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?C.green:cur?C.accent:C.surfaceLight,color:!done&&!cur?C.textDim:"#fff",animation:cur?"pulse 1.5s ease infinite":"none"}}>{done?"✓":cur?"⟳":i+1}</div><span style={{fontSize:13,fontWeight:cur?600:400,color:!done&&!cur?C.textDim:C.text}}>{s.t}</span></div>)})}</div>
    </div></GC>
  </div>)}

  // ═══ DASHBOARD ═══
  if(!d)return null;
  const mt=MT[d.marketType]||MT.fragmented;
  const tabs=[{id:"overview",l:"Overview"},{id:"competition",l:"Competition"},{id:"structure",l:"Market Structure"},{id:"acv",l:"ACV Benchmarks"},{id:"strategy",l:"Strategic Insights"}];
  const fT=n=>n==null?"N/A":n>=1000?`$${(n/1000).toFixed(1)}T`:n>=1?`$${n.toFixed(1)}B`:`$${(n*1000).toFixed(0)}M`;
  const tc={Leader:C.accent,Challenger:C.purple,Competitor:C.textMuted,Emerging:C.green,Adjacent:C.orange};

  return(<div style={{minHeight:"100vh",background:C.bg}}>
    {/* Header */}
    <div style={{position:"sticky",top:0,zIndex:50,background:`${C.bg}ee`,backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.border}`,padding:"12px 24px"}}><div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>◎</div><span style={{fontSize:16,fontWeight:700,color:C.text}}>{d.company}</span><Bdg color={C.accent}>{d.category}</Bdg><Bdg color={C.green}>Live Data</Bdg></div><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:11,color:C.textDim}}>{d.date}</span><button onClick={reset} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:12,cursor:"pointer"}}>New Analysis</button></div></div></div>
    {/* Tabs */}
    <div style={{borderBottom:`1px solid ${C.border}`,padding:"0 24px"}}><div style={{maxWidth:1200,margin:"0 auto",display:"flex",overflowX:"auto"}}>{tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"12px 20px",border:"none",background:"transparent",whiteSpace:"nowrap",color:tab===t.id?C.accent:C.textDim,fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent"}}>{t.l}</button>))}</div></div>
    {/* Content */}
    <div style={{maxWidth:1200,margin:"0 auto",padding:24}}>

    {tab==="overview"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
      {d.companyDescription&&<div style={{fontSize:14,color:C.textMuted,lineHeight:1.6}}><strong style={{color:C.text}}>{d.company}</strong>: {d.companyDescription}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
        <GC style={{padding:20}}><MX label="TAM" value={fT(d.tam)} sub={d.tamSource} color={C.accent}/></GC>
        <GC style={{padding:20}}><MX label="Penetration" value={`${d.penetration}%`} sub={d.penetration<30?"Low — share up for grabs":d.penetration<60?"Moderate":"High"} color={d.penetration<30?C.green:d.penetration<60?C.yellow:C.red}/></GC>
        <GC style={{padding:20}}><MX label="Market Type" value={mt.label} sub={mt.desc} color={mt.color}/></GC>
        <GC style={{padding:20}}><MX label="Growth" value={`${d.growth}%`} sub={d.growthSource||"CAGR"} color={d.growth>20?C.green:C.yellow}/></GC>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Market Size Pyramid</div><Pyramid tam={d.tam} sam={d.sam} som={d.som}/></GC>
        <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Market Structure</div><Gauge marketType={d.marketType}/></GC>
      </div>
      <GC glow style={{borderColor:mt.color+"40"}}><div style={{display:"flex",gap:16}}><div style={{width:42,height:42,borderRadius:12,flexShrink:0,background:`${mt.color}15`,border:`1px solid ${mt.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{mt.icon}</div><div><div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:6}}>Share Dynamics</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.7}}>{d.shareDynamics||d.marketTypeReasoning}</div></div></div></GC>
    </div>}

    {tab==="competition"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <GC style={{padding:20}}><MX label="Competitors" value={d.competitors.length} color={C.accent}/></GC>
        <GC style={{padding:20}}><MX label="Top 3 Share" value={d.top3Share?`${d.top3Share}%`:"N/A"} color={d.top3Share>60?C.red:C.green} sub={d.top3Share>60?"Concentrated":"Distributed"}/></GC>
        <GC style={{padding:20}}><MX label="Leader" value={d.competitors[0]?.name||"N/A"} sub={d.competitors[0]?.share?`~${d.competitors[0].share}%`:""} color={C.purple}/></GC>
      </div>
      <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:20}}>Market Share</div><CBars competitors={d.competitors}/></GC>
      <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Competitor Details</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Company","Type","Revenue","Share","Employees","Differentiator"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",borderBottom:`1px solid ${C.border}`,color:C.textDim,fontWeight:500,fontSize:11,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>)}</tr></thead><tbody>{d.competitors.map(c=><tr key={c.name} style={{borderBottom:`1px solid ${C.border}15`}}><td style={{padding:"10px 12px"}}><div style={{fontWeight:600,color:C.text}}>{c.name}</div>{c.description&&<div style={{fontSize:11,color:C.textDim,marginTop:2,maxWidth:200}}>{c.description}</div>}</td><td style={{padding:"10px 12px"}}><Bdg color={tc[c.type]||C.accent}>{c.type}</Bdg></td><td style={{padding:"10px 12px",color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{c.revenue?`$${c.revenue>=1000?(c.revenue/1000).toFixed(1)+"B":c.revenue+"M"}`:"—"}</td><td style={{padding:"10px 12px",color:C.accent,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,fontSize:12}}>{c.share?`${c.share}%`:"—"}</td><td style={{padding:"10px 12px",color:C.textMuted,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{c.employees?c.employees.toLocaleString():"—"}</td><td style={{padding:"10px 12px",color:C.textMuted,fontSize:12,maxWidth:200}}>{c.differentiator||"—"}</td></tr>)}</tbody></table></div></GC>
    </div>}

    {tab==="structure"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
      <GC glow><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:24}}>Market Structure Diagnosis</div><Gauge marketType={d.marketType}/>{d.marketTypeReasoning&&<div style={{fontSize:13,color:C.textMuted,lineHeight:1.7,marginTop:16,textAlign:"center",maxWidth:500,margin:"16px auto 0"}}>{d.marketTypeReasoning}</div>}</GC>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:20}}>Structural Dimensions</div>{[{l:"Penetration",v:d.penetration,m:100,u:"%",c:C.accent,desc:d.penetrationReasoning},{l:"HHI",v:d.hhi,m:5000,u:"",c:C.red,desc:d.hhi<1000?"Unconcentrated":d.hhi<2500?"Moderate":"Highly concentrated"},{l:"Fragmentation",v:d.fragmentation,m:100,u:"/100",c:C.yellow},{l:"Switching Cost",v:d.switchingCost,m:5,u:"/5",c:C.orange},{l:"Regulatory",v:d.regulatoryBarrier,m:5,u:"/5",c:C.purple}].map(x=><div key={x.l} style={{marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.text}}>{x.l}</span><span style={{fontSize:12,fontWeight:700,color:x.c,fontFamily:"'JetBrains Mono',monospace"}}>{x.v}{x.u}</span></div><MB value={x.v} max={x.m} color={x.c} height={8}/>{x.desc&&<div style={{fontSize:11,color:C.textDim,marginTop:3}}>{x.desc}</div>}</div>)}</GC>
        <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Share Dynamics</div><div style={{background:C.surfaceLight,borderRadius:12,padding:20,border:`1px solid ${mt.color}30`}}><div style={{fontSize:20,fontWeight:700,color:mt.color,marginBottom:8}}>{d.penetration<30?"Share Is Up For Grabs":d.top3Share>60?"Leaders Have Taken Share":"Market In Transition"}</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.7}}>{d.shareDynamics||d.marketTypeReasoning}</div></div>{d.keyTrend&&<div style={{padding:"12px 14px",borderRadius:10,background:`${C.cyan}10`,border:`1px solid ${C.cyan}25`,marginTop:12}}><div style={{fontSize:11,fontWeight:600,color:C.cyan,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Key Trend</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.6}}>{d.keyTrend}</div></div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:3,borderRadius:10,overflow:"hidden",marginTop:12}}>{d.competitors.filter(c=>c.share).map((c,i)=>{const cls=[C.accent,C.purple,C.green,C.yellow,C.orange,C.cyan,C.red];const cl=cls[i%cls.length];return<div key={c.name} style={{flex:`${c.share} 0 0`,minWidth:c.share>5?55:30,height:48,background:`${cl}20`,border:`1px solid ${cl}40`,borderRadius:6,padding:5,display:"flex",flexDirection:"column",justifyContent:"center",overflow:"hidden"}}>{c.share>7&&<div style={{fontSize:9,fontWeight:600,color:cl,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>}<div style={{fontSize:11,fontWeight:700,color:cl,fontFamily:"'JetBrains Mono',monospace"}}>{c.share}%</div></div>})}</div></GC>
      </div>
    </div>}

    {tab==="acv"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>{[{s:"SMB",d:d.acv.smb,c:C.green},{s:"Mid-Market",d:d.acv.midMarket,c:C.accent},{s:"Enterprise",d:d.acv.enterprise,c:C.purple}].map(x=><GC key={x.s} style={{padding:20}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:13,fontWeight:600,color:x.c}}>{x.s}</span><CD value={x.d?.confidence||.5}/></div><div style={{fontSize:26,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono',monospace"}}>{x.d?.mid?(x.d.mid>=1e6?`$${(x.d.mid/1e6).toFixed(1)}M`:x.d.mid>=1000?`$${(x.d.mid/1000).toFixed(0)}K`:`$${x.d.mid}`):"N/A"}</div>{x.d?.low!=null&&<div style={{fontSize:11,color:C.textDim,marginTop:4}}>Range: ${x.d.low>=1000?`${(x.d.low/1000).toFixed(0)}K`:x.d.low} – ${x.d.high>=1e6?`${(x.d.high/1e6).toFixed(1)}M`:x.d.high>=1000?`${(x.d.high/1000).toFixed(0)}K`:x.d.high}</div>}</GC>)}</div>
      <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:20}}>ACV Range Comparison</div><ACVChart acv={d.acv}/></GC>
      {d.acv.pricingNotes&&<GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:8}}>Pricing Intelligence</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.7}}>{d.acv.pricingNotes}</div></GC>}
    </div>}

    {tab==="strategy"&&<div style={{display:"flex",flexDirection:"column",gap:20}}>
      <GC glow style={{borderColor:mt.color+"30"}}><div style={{display:"flex",gap:16}}><div style={{width:48,height:48,borderRadius:14,flexShrink:0,background:`${mt.color}15`,border:`1px solid ${mt.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{mt.icon}</div><div><div style={{fontSize:22,fontWeight:700,color:mt.color,fontFamily:"'Instrument Serif',Georgia,serif"}}>{mt.label} Market</div><div style={{fontSize:14,color:C.textMuted,lineHeight:1.7,marginTop:8}}>{d.marketTypeReasoning}</div>{d.shareDynamics&&d.shareDynamics!==d.marketTypeReasoning&&<div style={{fontSize:14,color:C.textMuted,lineHeight:1.7,marginTop:8}}>{d.shareDynamics}</div>}</div></div></GC>
      <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:20}}>Strategic Insights</div><div style={{display:"flex",flexDirection:"column",gap:12}}>{d.insights.map((ins,i)=><div key={i} style={{display:"flex",gap:14,padding:"14px 16px",background:C.surfaceLight,borderRadius:10,border:`1px solid ${C.border}`}}><div style={{width:28,height:28,borderRadius:8,flexShrink:0,background:`${C.accent}15`,border:`1px solid ${C.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.accent}}>{i+1}</div><div style={{fontSize:13,color:C.textMuted,lineHeight:1.7}}>{ins}</div></div>)}</div></GC>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Opportunity Assessment</div>{[{l:"Market Attractiveness",v:d.opp.market_attractiveness,c:C.green},{l:"Competitive Intensity",v:d.opp.competitive_intensity,c:C.red},{l:"Entry Feasibility",v:d.opp.entry_feasibility,c:C.accent},{l:"Timing",v:d.opp.timing_score,c:C.yellow}].map(x=><div key={x.l} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.textMuted}}>{x.l}</span><span style={{fontSize:12,fontWeight:600,color:x.c,fontFamily:"'JetBrains Mono',monospace"}}>{x.v||0}/100</span></div><MB value={x.v||0} color={x.c} height={6}/></div>)}</GC>
        <GC><div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Risk Factors</div>{(d.risks||[]).map((r,i)=><div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<d.risks.length-1?`1px solid ${C.border}30`:"none"}}><span style={{color:C.yellow,fontSize:12}}>⚠</span><span style={{fontSize:13,color:C.textMuted,lineHeight:1.6}}>{r}</span></div>)}</GC>
      </div>
    </div>}

    </div>
    <div style={{borderTop:`1px solid ${C.border}`,padding:"16px 24px",marginTop:40,display:"flex",justifyContent:"center"}}><span style={{fontSize:11,color:C.textDim}}>MarketScope — AI-powered live market intelligence</span></div>
  </div>)
}
