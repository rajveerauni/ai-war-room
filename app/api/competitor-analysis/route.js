import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fetchCompetitorBundle } from '../../../lib/dataFetcher.js';

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});
const MODEL = 'grok-3';

function fmt(n, unit = '') {
  if (n == null) return 'N/A';
  if (unit === '$B') return `$${(n / 1e9).toFixed(1)}B`;
  if (unit === '$M') return `$${(n / 1e6).toFixed(0)}M`;
  return `${n}${unit}`;
}

export async function POST(req) {
  try {
    const { competitor, userCompany, industry } = await req.json();
    if (!competitor) return NextResponse.json({ error: 'competitor required' }, { status: 400 });

    const bundle = await fetchCompetitorBundle(competitor);
    const { stock, news, reddit, trends } = bundle;

    // Build context strings
    const stockCtx = stock
      ? `$${stock.price} (${stock.change > 0 ? '+' : ''}${stock.change}%), MCap: ${fmt(stock.marketCap, '$B')}, 52W: ${fmt(stock.low52)}–${fmt(stock.high52)}`
      : 'Not publicly traded or data unavailable';

    const newsCtx = news.articles.length
      ? news.articles.map((a) => `• ${a.title} [${new Date(a.publishedAt).toLocaleDateString()}]`).join('\n')
      : 'No recent news found';

    const redditCtx = reddit.posts.length
      ? `Sentiment: ${reddit.sentiment} (score ${reddit.sentimentScore > 0 ? '+' : ''}${reddit.sentimentScore})\n` +
        reddit.posts.slice(0, 5).map((p) => `• r/${p.subreddit}: ${p.title}`).join('\n')
      : 'No Reddit data';

    const trendsAvg = trends.length
      ? Math.round(trends.slice(-4).reduce((s, t) => s + t.value, 0) / 4)
      : null;

    const prompt = `You are a senior business intelligence analyst. Analyze ${competitor} as a competitor to ${userCompany} in the ${industry} industry.

LIVE MARKET DATA (fetched now):
Stock: ${stockCtx}
Google Trends (recent avg): ${trendsAvg != null ? trendsAvg + '/100' : 'N/A'}
Reddit Sentiment: ${reddit.sentiment} (${reddit.sentimentScore > 0 ? '+' : ''}${reddit.sentimentScore})

Recent News Headlines:
${newsCtx}

Recent Reddit Discussions:
${redditCtx}

Based STRICTLY on this real data, return EXACTLY:

JSON:
{
  "threatLevel": "High",
  "radarScores": {
    "Innovation": [70, 85],
    "Market Reach": [65, 78],
    "Brand Power": [72, 60],
    "Tech Capability": [80, 75],
    "Customer NPS": [68, 55],
    "Growth Rate": [75, 82]
  },
  "strengths": ["Evidence-based strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Evidence-based weakness 1", "Weakness 2", "Weakness 3"],
  "recommendations": ["Actionable recommendation for ${userCompany} 1", "Recommendation 2", "Recommendation 3"]
}
END_JSON

ANALYSIS:
3 paragraphs of strategic analysis grounded in the live data above. Cite specific numbers.`;

    const response = await grok.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
    });

    return NextResponse.json({
      text: response.choices[0]?.message?.content || '',
      dataUsed: {
        stock: !!stock,
        news: news.articles.length,
        reddit: reddit.posts.length,
        trends: trends.length,
      },
      liveData: { stock, reddit: { sentiment: reddit.sentiment, sentimentScore: reddit.sentimentScore }, trendsAvg },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[competitor-analysis]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
