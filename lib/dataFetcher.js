import axios from 'axios';
import { getCache, setCache } from './cache.js';

const NEWS_KEY = process.env.NEWS_API_KEY;
const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

// ─── Ticker lookup ───────────────────────────────────────────────────────────
export async function findTicker(companyName) {
  const key = `ticker:${companyName.toLowerCase()}`;
  const cached = getCache(key);
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(companyName)}&quotesCount=1&newsCount=0`,
      { headers: YF_HEADERS, timeout: 6000 }
    );
    const ticker = data.quotes?.[0]?.symbol || null;
    setCache(key, ticker, 24 * 60 * 60 * 1000);
    return ticker;
  } catch {
    setCache(key, null, 60 * 60 * 1000);
    return null;
  }
}

// ─── Stock quote ─────────────────────────────────────────────────────────────
export async function fetchStockData(nameOrTicker) {
  const ticker = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(nameOrTicker)
    ? nameOrTicker
    : await findTicker(nameOrTicker);
  if (!ticker) return null;

  const key = `stock:${ticker}`;
  const cached = getCache(key);
  if (cached !== null) return cached;

  try {
    const [chartRes, summaryRes] = await Promise.allSettled([
      axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
        { headers: YF_HEADERS, timeout: 8000 }
      ),
      axios.get(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail`,
        { headers: YF_HEADERS, timeout: 6000 }
      ),
    ]);

    const meta = chartRes.status === 'fulfilled'
      ? chartRes.value.data.chart?.result?.[0]?.meta
      : null;
    if (!meta) return null;

    const pe = summaryRes.status === 'fulfilled'
      ? (summaryRes.value.data?.quoteSummary?.result?.[0]?.summaryDetail?.trailingPE?.raw ?? null)
      : null;

    const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
    const price = meta.regularMarketPrice;
    const result = {
      ticker,
      price,
      previousClose: prev,
      change: prev ? parseFloat(((price - prev) / prev * 100).toFixed(2)) : 0,
      marketCap: meta.marketCap || null,
      dayHigh: meta.regularMarketDayHigh || null,
      dayLow: meta.regularMarketDayLow || null,
      high52: meta.fiftyTwoWeekHigh || null,
      low52: meta.fiftyTwoWeekLow || null,
      volume: meta.regularMarketVolume || null,
      currency: meta.currency || 'USD',
      pe,
    };
    setCache(key, result, 5 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

// ─── 30-day price history ────────────────────────────────────────────────────
export async function fetchStockHistory(nameOrTicker, range = '1mo') {
  const ticker = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(nameOrTicker)
    ? nameOrTicker
    : await findTicker(nameOrTicker);
  if (!ticker) return null;

  const key = `history:${ticker}:${range}`;
  const cached = getCache(key);
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`,
      { headers: YF_HEADERS, timeout: 8000 }
    );
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const { timestamp, indicators } = result;
    const closes = indicators.quote[0].close;

    const history = timestamp
      .map((ts, i) => ({
        date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: closes[i] != null ? parseFloat(closes[i].toFixed(2)) : null,
      }))
      .filter((d) => d.price !== null);

    setCache(key, history, 60 * 60 * 1000);
    return history;
  } catch {
    return null;
  }
}

// ─── News ────────────────────────────────────────────────────────────────────
export async function fetchCompanyNews(companyName, pageSize = 5) {
  if (!NEWS_KEY) return { articles: [], source: 'unavailable' };

  const key = `news:${companyName.toLowerCase()}`;
  const cached = getCache(key);
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(`"${companyName}"`)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${NEWS_KEY}`,
      { timeout: 8000 }
    );
    const result = {
      articles: (data.articles || []).map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source?.name,
        publishedAt: a.publishedAt,
      })),
      source: 'newsapi',
    };
    setCache(key, result, 5 * 60 * 1000);
    return result;
  } catch (err) {
    return { articles: [], source: 'error', error: err.message };
  }
}

// ─── Google Trends ───────────────────────────────────────────────────────────
export async function fetchGoogleTrends(companyName) {
  const key = `trends:${companyName.toLowerCase()}`;
  const cached = getCache(key);
  if (cached !== null) return cached;

  try {
    const googleTrends = (await import('google-trends-api')).default;
    const startTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const raw = await googleTrends.interestOverTime({ keyword: companyName, startTime });
    const parsed = JSON.parse(raw);
    const timeline = parsed.default.timelineData.map((d) => ({
      date: d.formattedTime,
      value: d.value[0],
    }));
    setCache(key, timeline, 24 * 60 * 60 * 1000);
    return timeline;
  } catch {
    return [];
  }
}

// ─── Reddit sentiment ─────────────────────────────────────────────────────────
const POS_WORDS = ['growth', 'profit', 'surge', 'beat', 'record', 'launch', 'strong', 'win', 'bullish', 'rise', 'gain', 'positive', 'innovation'];
const NEG_WORDS = ['loss', 'decline', 'drop', 'miss', 'fall', 'risk', 'concern', 'down', 'bearish', 'lawsuit', 'fail', 'weak', 'negative', 'scandal'];

export async function fetchRedditSentiment(companyName) {
  const key = `reddit:${companyName.toLowerCase()}`;
  const cached = getCache(key);
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(companyName)}&sort=new&limit=10&type=link`,
      { headers: { 'User-Agent': 'AIWarRoom/1.0' }, timeout: 8000 }
    );
    const posts = (data.data?.children || []).map((p) => ({
      title: p.data.title,
      score: p.data.score,
      subreddit: p.data.subreddit,
      url: `https://reddit.com${p.data.permalink}`,
      created: p.data.created_utc,
    }));

    let score = 0;
    posts.forEach((p) => {
      const t = p.title.toLowerCase();
      POS_WORDS.forEach((w) => { if (t.includes(w)) score++; });
      NEG_WORDS.forEach((w) => { if (t.includes(w)) score--; });
    });

    const result = {
      posts,
      sentimentScore: score,
      sentiment: score > 2 ? 'Positive' : score < -2 ? 'Negative' : 'Neutral',
    };
    setCache(key, result, 15 * 60 * 1000);
    return result;
  } catch {
    return { posts: [], sentimentScore: 0, sentiment: 'Neutral' };
  }
}

// ─── Alpha Vantage financials ─────────────────────────────────────────────────
export async function fetchFinancials(ticker) {
  if (!AV_KEY) return null;
  const key = `financials:${ticker}`;
  const cached = getCache(key);
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get(
      `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${AV_KEY}`,
      { timeout: 10000 }
    );
    if (data.Note || data.Information) return null; // rate limit hit
    const annual = data.annualReports?.[0];
    if (!annual) return null;

    const result = {
      ticker,
      revenue: parseInt(annual.totalRevenue) || null,
      grossProfit: parseInt(annual.grossProfit) || null,
      netIncome: parseInt(annual.netIncome) || null,
      year: annual.fiscalDateEnding?.slice(0, 4),
    };
    setCache(key, result, 24 * 60 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

// ─── Batch: all competitor data ───────────────────────────────────────────────
export async function fetchCompetitorBundle(name) {
  const [stock, news, reddit, trends] = await Promise.allSettled([
    fetchStockData(name),
    fetchCompanyNews(name, 5),
    fetchRedditSentiment(name),
    fetchGoogleTrends(name),
  ]);
  return {
    name,
    stock: stock.status === 'fulfilled' ? stock.value : null,
    news: news.status === 'fulfilled' ? news.value : { articles: [] },
    reddit: reddit.status === 'fulfilled' ? reddit.value : { posts: [], sentiment: 'Neutral', sentimentScore: 0 },
    trends: trends.status === 'fulfilled' ? trends.value : [],
  };
}
