import {
  PREDICT_MARKET_LIST_PAGE_SIZE,
  normalizeMarketListParams,
  predictMarketListKeys,
  predictMarketListOptions,
} from './marketList';
import type { PredictMarketListResponse } from '../types';

const mockListMarkets = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      listMarkets: (...args: unknown[]) => mockListMarkets(...args),
    },
  },
}));

describe('marketList query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeMarketListParams', () => {
    it('defaults limit to the page size and drops absent fields', () => {
      expect(normalizeMarketListParams()).toEqual({
        tags: undefined,
        tagSlugs: undefined,
        series: undefined,
        order: undefined,
        status: undefined,
        live: undefined,
        search: undefined,
        limit: PREDICT_MARKET_LIST_PAGE_SIZE,
      });
    });

    it('sorts tags, tagSlugs and series so array order does not affect the result', () => {
      expect(
        normalizeMarketListParams({
          tags: ['b', 'a'],
          tagSlugs: ['nfl', 'nba'],
          series: ['2', '1'],
        }),
      ).toEqual(
        expect.objectContaining({
          tags: ['a', 'b'],
          tagSlugs: ['nba', 'nfl'],
          series: ['1', '2'],
        }),
      );
    });

    it('produces distinct keys for different tagSlugs (no chip cache collision)', () => {
      const nba = predictMarketListKeys.list(
        normalizeMarketListParams({ tagSlugs: ['nba'] }),
      );
      const nfl = predictMarketListKeys.list(
        normalizeMarketListParams({ tagSlugs: ['nfl'] }),
      );

      expect(nba).not.toEqual(nfl);
    });

    it('trims search and treats blank/whitespace as absent', () => {
      expect(normalizeMarketListParams({ search: '  brazil  ' }).search).toBe(
        'brazil',
      );
      expect(
        normalizeMarketListParams({ search: '   ' }).search,
      ).toBeUndefined();
      expect(normalizeMarketListParams({ search: '' }).search).toBeUndefined();
    });

    it('collapses live:false to undefined (only live:true is meaningful)', () => {
      expect(normalizeMarketListParams({ live: false }).live).toBeUndefined();
      expect(normalizeMarketListParams({}).live).toBeUndefined();
      expect(normalizeMarketListParams({ live: true }).live).toBe(true);
    });
  });

  describe('predictMarketListKeys', () => {
    it('produces a stable key regardless of param object key order', () => {
      const keyA = predictMarketListKeys.list(
        normalizeMarketListParams({
          order: 'volume24hr',
          status: 'open',
          tags: ['a', 'b'],
          limit: 20,
        }),
      );
      const keyB = predictMarketListKeys.list(
        normalizeMarketListParams({
          limit: 20,
          tags: ['b', 'a'],
          status: 'open',
          order: 'volume24hr',
        }),
      );

      expect(keyA).toEqual(keyB);
    });

    it('treats equivalent empty/falsy inputs as the same key', () => {
      const explicit = predictMarketListKeys.list(
        normalizeMarketListParams({ search: '  ', live: false }),
      );
      const absent = predictMarketListKeys.list(normalizeMarketListParams({}));

      expect(explicit).toEqual(absent);
    });

    it('produces a different key when a meaningful value changes', () => {
      const open = predictMarketListKeys.list(
        normalizeMarketListParams({ status: 'open' }),
      );
      const closed = predictMarketListKeys.list(
        normalizeMarketListParams({ status: 'closed' }),
      );

      expect(open).not.toEqual(closed);
    });

    it('is namespaced under predict/marketList', () => {
      const key = predictMarketListKeys.list(normalizeMarketListParams({}));
      expect(key[0]).toBe('predict');
      expect(key[1]).toBe('marketList');
    });
  });

  describe('predictMarketListOptions', () => {
    it('exposes a key derived from the normalized params', () => {
      const options = predictMarketListOptions({ tags: ['b', 'a'] });
      expect(options.queryKey).toEqual(
        predictMarketListKeys.list(
          normalizeMarketListParams({ tags: ['b', 'a'] }),
        ),
      );
    });

    it('calls listMarkets with the page cursor on first page (null)', async () => {
      const response: PredictMarketListResponse = {
        markets: [],
        nextCursor: 'cursor-1',
      };
      mockListMarkets.mockResolvedValueOnce(response);

      const options = predictMarketListOptions({ order: 'volume24hr' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await options.queryFn({ pageParam: undefined } as any);

      expect(result).toBe(response);
      expect(mockListMarkets).toHaveBeenCalledWith({
        order: 'volume24hr',
        afterCursor: null,
      });
    });

    it('passes the cursor through as afterCursor on subsequent pages', async () => {
      mockListMarkets.mockResolvedValueOnce({ markets: [], nextCursor: null });

      const options = predictMarketListOptions({ order: 'volume24hr' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await options.queryFn({ pageParam: 'cursor-1' } as any);

      expect(mockListMarkets).toHaveBeenCalledWith({
        order: 'volume24hr',
        afterCursor: 'cursor-1',
      });
    });

    it('getNextPageParam returns nextCursor, then undefined when null', () => {
      const options = predictMarketListOptions({});
      expect(
        options.getNextPageParam({ markets: [], nextCursor: 'cursor-2' }),
      ).toBe('cursor-2');
      expect(
        options.getNextPageParam({ markets: [], nextCursor: null }),
      ).toBeUndefined();
      expect(options.getNextPageParam({ markets: [] })).toBeUndefined();
    });
  });
});
