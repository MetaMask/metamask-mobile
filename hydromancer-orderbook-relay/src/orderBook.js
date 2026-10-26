const MAX_LEVELS = 20;

/**
 * Maps one vendor L2 snapshot into the `OrderBookData` shape the mobile
 * order-book UI already renders.
 *
 * Accepts either Hydromancer's `{ levels: [bids, asks] }` envelope or the
 * QuickNode `StreamL2Book` shape `{ bids, asks }` where each level is
 * `{ px, sz, n }` and `sz` is the size resting at that price.
 *
 * @param {{
 *   coin?: string,
 *   time: number | string,
 *   levels?: [{ px: string, sz: string }[], { px: string, sz: string }[]],
 *   bids?: { px: string, sz: string }[],
 *   asks?: { px: string, sz: string }[],
 * }} data
 * @returns {object}
 */
export function toOrderBookData(data) {
  const rawBids = data.levels?.[0] ?? data.bids ?? [];
  const rawAsks = data.levels?.[1] ?? data.asks ?? [];
  const bids = toLevels(rawBids);
  const asks = toLevels(rawAsks);
  const bestBid = Number.parseFloat(bids[0]?.price ?? '');
  const bestAsk = Number.parseFloat(asks[0]?.price ?? '');
  const hasSpread = Number.isFinite(bestBid) && Number.isFinite(bestAsk);
  const spread = hasSpread ? bestAsk - bestBid : 0;
  const midPrice = hasSpread ? (bestBid + bestAsk) / 2 : 0;
  const spreadPercentage = midPrice > 0 ? (spread / midPrice) * 100 : 0;
  const maxTotal = [...bids, ...asks].reduce((max, level) => {
    const total = Number.parseFloat(level.total);
    return Number.isFinite(total) && total > max ? total : max;
  }, 0);
  const lastUpdated = Number(data.time);
  return {
    bids,
    asks,
    spread: spread.toString(),
    spreadPercentage: spreadPercentage.toString(),
    midPrice: midPrice.toString(),
    lastUpdated: Number.isFinite(lastUpdated) ? lastUpdated : Date.now(),
    maxTotal: maxTotal.toString(),
  };
}

function toLevels(levels) {
  let cumulativeSize = 0;
  let cumulativeNotional = 0;

  return (levels ?? []).slice(0, MAX_LEVELS).map((level) => {
    const price = Number.parseFloat(level.px);
    const size = Number.parseFloat(level.sz);
    const notional =
      Number.isFinite(price) && Number.isFinite(size) ? price * size : 0;
    cumulativeSize += Number.isFinite(size) ? size : 0;
    cumulativeNotional += notional;
    return {
      price: level.px,
      size: level.sz,
      total: cumulativeSize.toString(),
      notional: notional.toFixed(2),
      totalNotional: cumulativeNotional.toFixed(2),
    };
  });
}
