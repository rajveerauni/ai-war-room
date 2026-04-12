import { NextResponse } from 'next/server';
import {
  fetchStockHistory, fetchStockData, fetchCompanyNews,
  fetchGoogleTrends, fetchRedditSentiment,
} from '../../../lib/dataFetcher.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const companies = (searchParams.get('companies') || '').split(',').map((c) => c.trim()).filter(Boolean);

  if (!companies.length) return NextResponse.json({ error: 'No companies' }, { status: 400 });

  const [userCompany, ...competitors] = companies;

  // User company: stock history + news
  const [historyResult, userNewsResult] = await Promise.allSettled([
    fetchStockHistory(userCompany, '1mo'),
    fetchCompanyNews(userCompany, 3),
  ]);

  // Competitors: stock + trends + reddit in parallel
  const competitorResults = await Promise.allSettled(
    competitors.map(async (name) => {
      const [stock, trends, reddit, news] = await Promise.allSettled([
        fetchStockData(name),
        fetchGoogleTrends(name),
        fetchRedditSentiment(name),
        fetchCompanyNews(name, 3),
      ]);
      return {
        name,
        stock: stock.status === 'fulfilled' ? stock.value : null,
        trends: trends.status === 'fulfilled' ? trends.value : [],
        reddit: reddit.status === 'fulfilled' ? reddit.value : { sentiment: 'Neutral', sentimentScore: 0, posts: [] },
        news: news.status === 'fulfilled' ? news.value : { articles: [] },
      };
    })
  );

  // Also fetch user company trends for comparison chart
  const [userTrendsResult, userStockResult] = await Promise.allSettled([
    fetchGoogleTrends(userCompany),
    fetchStockData(userCompany),
  ]);

  return NextResponse.json({
    userCompany: {
      name: userCompany,
      stockHistory: historyResult.status === 'fulfilled' ? historyResult.value : null,
      stock: userStockResult.status === 'fulfilled' ? userStockResult.value : null,
      trends: userTrendsResult.status === 'fulfilled' ? userTrendsResult.value : [],
      news: userNewsResult.status === 'fulfilled' ? userNewsResult.value : { articles: [] },
    },
    competitors: competitorResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value),
    fetchedAt: new Date().toISOString(),
  });
}
