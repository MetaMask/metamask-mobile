import type { Position, PositionsResponse } from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import {
  fetchTraderPositionsPage,
  flattenTraderPositionPages,
  getNextTraderPositionsPageParam,
  getTraderPositionKey,
  keepFirstTraderPositionsPage,
  replaceFirstTraderPositionsPage,
  type TraderPositionsInfiniteData,
} from './traderPositionsPagination';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

const mockCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const makePosition = (positionId: string): Position =>
  ({
    positionId,
    tokenAddress: `0x${positionId}`,
    chain: 'ethereum',
  }) as unknown as Position;

const makePage = (
  ids: string[],
  pagination: PositionsResponse['pagination'] = { hasMore: false },
): PositionsResponse => ({
  positions: ids.map(makePosition),
  pagination,
});

const makeInfinite = (
  pages: PositionsResponse[],
): TraderPositionsInfiniteData => ({
  pages,
  pageParams: pages.map((_, index) => index + 1),
});

describe('traderPositionsPagination', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  describe('fetchTraderPositionsPage', () => {
    it('requests one open page through the open-positions action', async () => {
      const page = makePage(['a']);
      mockCall.mockResolvedValue(page);

      await expect(
        fetchTraderPositionsPage('open', 'trader-1', 2),
      ).resolves.toBe(page);

      expect(mockCall).toHaveBeenCalledWith(
        'SocialService:fetchOpenPositions',
        { addressOrId: 'trader-1', limit: 100, page: 2 },
      );
    });

    it('requests one closed page through the closed-positions action, newest first', async () => {
      const page = makePage(['b']);
      mockCall.mockResolvedValue(page);

      await expect(
        fetchTraderPositionsPage('closed', 'trader-1', 3),
      ).resolves.toBe(page);

      expect(mockCall).toHaveBeenCalledWith(
        'SocialService:fetchClosedPositions',
        { addressOrId: 'trader-1', sort: 'latest', limit: 100, page: 3 },
      );
    });
  });

  describe('getNextTraderPositionsPageParam', () => {
    it('returns the next page when the API reports more', () => {
      expect(
        getNextTraderPositionsPageParam(
          makePage(['a'], { hasMore: true, nextPage: 3 }),
        ),
      ).toBe(3);
    });

    it('returns undefined when the API reports no more pages', () => {
      expect(
        getNextTraderPositionsPageParam(
          makePage(['a'], { hasMore: false, nextPage: 3 }),
        ),
      ).toBeUndefined();
    });

    it('returns undefined when hasMore is set without a nextPage', () => {
      expect(
        getNextTraderPositionsPageParam(makePage(['a'], { hasMore: true })),
      ).toBeUndefined();
    });
  });

  describe('getTraderPositionKey', () => {
    it('keys a position by its positionId when present', () => {
      expect(getTraderPositionKey(makePosition('eth-spot'))).toBe('eth-spot');
    });

    it('falls back to token address and chain when positionId is missing', () => {
      const position = {
        tokenAddress: '0xusdc',
        chain: 'base',
      } as unknown as Position;

      expect(getTraderPositionKey(position)).toBe('0xusdc-base');
    });
  });

  describe('flattenTraderPositionPages', () => {
    it('returns an empty list when there are no pages', () => {
      expect(flattenTraderPositionPages(undefined)).toEqual([]);
      expect(flattenTraderPositionPages([])).toEqual([]);
    });

    it('concatenates pages in order', () => {
      const flattened = flattenTraderPositionPages([
        makePage(['a', 'b']),
        makePage(['c']),
      ]);

      expect(flattened.map((position) => position.positionId)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('keeps the first occurrence of a position that appears on two pages', () => {
      const first = makePosition('dup');
      const second = { ...makePosition('dup'), pnlPercent: 99 } as Position;
      const flattened = flattenTraderPositionPages([
        { positions: [first], pagination: { hasMore: true, nextPage: 2 } },
        { positions: [second], pagination: { hasMore: false } },
      ]);

      expect(flattened).toEqual([first]);
    });
  });

  describe('keepFirstTraderPositionsPage', () => {
    it('drops every page after the first and its page param', () => {
      const data = makeInfinite([makePage(['a']), makePage(['b'])]);

      const kept = keepFirstTraderPositionsPage(data);

      expect(kept?.pages).toHaveLength(1);
      expect(kept?.pages[0]).toBe(data.pages[0]);
      expect(kept?.pageParams).toEqual([1]);
    });

    it('returns single-page data unchanged', () => {
      const data = makeInfinite([makePage(['a'])]);

      expect(keepFirstTraderPositionsPage(data)).toBe(data);
    });

    it('passes undefined through', () => {
      expect(keepFirstTraderPositionsPage(undefined)).toBeUndefined();
    });
  });

  describe('replaceFirstTraderPositionsPage', () => {
    it('swaps in a fresh first page and keeps the pages already loaded', () => {
      const data = makeInfinite([
        makePage(['old-1']),
        makePage(['old-2']),
        makePage(['old-3']),
      ]);
      const freshFirst = makePage(['new-1']);

      const updated = replaceFirstTraderPositionsPage(data, freshFirst);

      expect(updated?.pages[0]).toBe(freshFirst);
      expect(updated?.pages[1]).toBe(data.pages[1]);
      expect(updated?.pages[2]).toBe(data.pages[2]);
      expect(updated?.pageParams).toEqual(data.pageParams);
    });

    it('does nothing when there is no cached data yet', () => {
      expect(
        replaceFirstTraderPositionsPage(undefined, makePage(['new'])),
      ).toBeUndefined();
    });
  });
});
