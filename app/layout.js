import './globals.css';

export const metadata = {
  title: 'MarketScope — AI Market Intelligence',
  description: 'Live market research powered by AI. Enter any company to get TAM/SAM/SOM, competitive landscape, ACV benchmarks, and market structure analysis.',
  openGraph: {
    title: 'MarketScope — AI Market Intelligence',
    description: 'Enter any company. Get instant market research powered by AI with live web search.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Instrument+Serif&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
