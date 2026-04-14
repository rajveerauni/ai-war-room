import { fetchStockData, fetchStockHistory, findTicker } from '../../../lib/dataFetcher';

export async function GET(req) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return Response.json({ error: 'Query required' }, { status: 400 });

  // If it looks like a ticker already, use it directly; otherwise resolve via search
  const isRawTicker = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(q.toUpperCase());
  const ticker = isRawTicker ? q.toUpperCase() : await findTicker(q);

  if (!ticker) {
    return Response.json({ error: `No ticker found for "${q}". Try a ticker symbol like AAPL or TSLA.` }, { status: 404 });
  }

  const [stock, stockHistory] = await Promise.all([
    fetchStockData(ticker),
    fetchStockHistory(ticker, '1mo'),
  ]);

  if (!stock) {
    return Response.json({ error: `Found ticker "${ticker}" but could not fetch market data.` }, { status: 404 });
  }

  return Response.json({ ticker, stock, stockHistory, query: q });
}
