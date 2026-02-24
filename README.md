# MarketScope — AI Market Intelligence

Enter any company name and URL → get instant market research powered by AI with live web search.

**Features:**
- Real competitor identification via web search
- TAM/SAM/SOM market sizing from live data
- ACV benchmarks by segment (SMB / Mid-Market / Enterprise)
- Market structure diagnosis (Consolidated → Land Grab spectrum)
- Strategic insights and risk analysis

## Deploy to Vercel (2 minutes)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "MarketScope v1"
gh repo create marketscope --public --push
```

Or manually create a repo at github.com and push.

### Step 2: Deploy on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. **Add Environment Variable:**
   - Name: `ANTHROPIC_API_KEY`  
   - Value: your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
4. Click **Deploy**

That's it! Your app will be live at `https://marketscope-xxx.vercel.app`

## Run Locally

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

- **Frontend:** Next.js 14 + React 18 (App Router)
- **API:** Server-side route at `/api/analyze` keeps your API key secure
- **AI:** Claude Sonnet with web search tool for live research
- **Pipeline:** 3-step agent pipeline (Competitors → Market Data → Strategy)

## How It Works

1. User enters company name + URL
2. Server calls Claude API with web search enabled
3. **Agent 1** researches the company and identifies real competitors
4. **Agent 2** sizes the market, researches pricing, estimates penetration
5. **Agent 3** synthesizes strategic insights
6. Dashboard renders with 5 interactive tabs
