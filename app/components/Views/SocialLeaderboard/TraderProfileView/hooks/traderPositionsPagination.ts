import type { InfiniteData } from '@tanstack/react-query';
import type {
  FetchPositionsOptions,
  Position,
  PositionsResponse,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import { TRADER_POSITIONS_FETCH_LIMIT } from '../../../../../util/social/traderProfileQueries';

export type TraderPositionsStatus = 'open' | 'closed';

export type TraderPositionsInfiniteData = InfiniteData<
  PositionsResponse,
  number
>;

/**
 * Fetches one page of a trader's positions via `SocialService`.
 *
 * Call as a member expression so the messenger keeps its `this` binding;
 * aliasing `.call` into a local detaches it and breaks action lookup.
 */
export const fetchTraderPositionsPage = (
  status: TraderPositionsStatus,
  addressOrId: string,
  page: number,
): Promise<PositionsResponse> => {
  const messenger = Engine.controllerMessenger as unknown as {
    call: (
      action:
        | 'SocialService:fetchOpenPositions'
        | 'SocialService:fetchClosedPositions',
      options: FetchPositionsOptions,
    ) => Promise<PositionsResponse>;
  };

  if (status === 'open') {
    return messenger.call('SocialService:fetchOpenPositions', {
      addressOrId,
      limit: TRADER_POSITIONS_FETCH_LIMIT,
      page,
    });
  }

  return messenger.call('SocialService:fetchClosedPositions', {
    addressOrId,
    sort: 'latest',
    limit: TRADER_POSITIONS_FETCH_LIMIT,
    page,
  });
};

/** Next 1-based page to request, or `undefined` once the API reports no more. */
export const getNextTraderPositionsPageParam = (
  lastPage: PositionsResponse,
): number | undefined =>
  lastPage.pagination.hasMore ? lastPage.pagination.nextPage : undefined;

/** Same identity rule the positions list uses to key rows. */
export const getTraderPositionKey = (position: Position): string =>
  position.positionId ?? `${position.tokenAddress}-${position.chain}`;

/**
 * Flattens loaded pages into one list. A position can shift between pages
 * while the list is open, so the first occurrence wins.
 */
export const flattenTraderPositionPages = (
  pages: readonly PositionsResponse[] | undefined,
): Position[] => {
  const seen = new Set<string>();
  const positions: Position[] = [];

  for (const page of pages ?? []) {
    for (const position of page.positions) {
      const key = getTraderPositionKey(position);
      if (!seen.has(key)) {
        seen.add(key);
        positions.push(position);
      }
    }
  }

  return positions;
};

/** Drops every page after the first so a refresh restarts from the top. */
export const keepFirstTraderPositionsPage = (
  data: TraderPositionsInfiniteData | undefined,
): TraderPositionsInfiniteData | undefined =>
  data && data.pages.length > 1
    ? {
        pages: data.pages.slice(0, 1),
        pageParams: data.pageParams.slice(0, 1),
      }
    : data;

/** Swaps in a fresh first page and keeps any pages the user already loaded. */
export const replaceFirstTraderPositionsPage = (
  data: TraderPositionsInfiniteData | undefined,
  firstPage: PositionsResponse,
): TraderPositionsInfiniteData | undefined =>
  data
    ? {
        pages: [firstPage, ...data.pages.slice(1)],
        pageParams: data.pageParams,
      }
    : data;
