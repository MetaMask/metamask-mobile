import type { PredictMarket, PredictMarketListResponse } from '../types';

export const createMarket = (id: string): PredictMarket =>
  ({ id, parentMarketId: undefined }) as unknown as PredictMarket;

export const createChildMarket = (id: string): PredictMarket =>
  ({ id, parentMarketId: 'parent-1' }) as unknown as PredictMarket;

export const createPage = (
  ids: string[],
  nextCursor: string | null = null,
): PredictMarketListResponse => ({
  markets: ids.map(createMarket),
  nextCursor,
});

export const createChildPage = (
  ids: string[],
  nextCursor: string | null = null,
): PredictMarketListResponse => ({
  markets: ids.map(createChildMarket),
  nextCursor,
});
