import { NextResponse } from 'next/server';
import { fetchCompanyNews } from '../../../lib/dataFetcher.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('companies') || '';
  const companies = raw.split(',').map((c) => c.trim()).filter(Boolean);

  if (!companies.length) {
    return NextResponse.json({ error: 'No companies specified', articles: [] }, { status: 400 });
  }

  const results = await Promise.allSettled(
    companies.map(async (company) => {
      const { articles, source } = await fetchCompanyNews(company, 5);
      return articles.map((a) => ({ ...a, company, source }));
    })
  );

  const allArticles = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 25);

  return NextResponse.json({
    articles: allArticles,
    fetchedAt: new Date().toISOString(),
    hasApiKey: !!process.env.NEWS_API_KEY,
  });
}
