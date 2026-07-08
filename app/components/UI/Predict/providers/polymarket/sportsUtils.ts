import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  isTeamToAdvanceMarketType,
  WORLD_CUP_LEAGUE,
} from '../../constants/sports';
import { getEventLeague } from '../../utils/gameParser';
import type { PolymarketApiEvent } from './types';
import { fetchChildEventsFromGammaApi } from './utils';

interface SportsFeedMarket {
  id?: string | number;
  sportsMarketType?: string;
}

interface SportsFeedEvent {
  id: string | number;
  parentEventId?: string | number | null;
  markets?: SportsFeedMarket[];
}

type FetchChildEvents = typeof fetchChildEventsFromGammaApi;

interface ResolveWorldCupFeedEventsParams {
  extendedSportsMarketsLeagues: string[];
  fetchChildEvents?: FetchChildEvents;
}

export const shouldFetchWorldCupChildMarkets = <
  TEvent extends Parameters<typeof getEventLeague>[0] & SportsFeedEvent,
>({
  event,
  extendedSportsMarketsLeagues,
}: {
  event: TEvent;
  extendedSportsMarketsLeagues: string[];
}): boolean => {
  if (!extendedSportsMarketsLeagues.includes(WORLD_CUP_LEAGUE)) {
    return false;
  }

  if (event.parentEventId) {
    return false;
  }

  const eventLeague = getEventLeague(event, extendedSportsMarketsLeagues);
  if (eventLeague !== WORLD_CUP_LEAGUE) {
    return false;
  }

  return !event.markets?.some((market) =>
    isTeamToAdvanceMarketType(market.sportsMarketType),
  );
};

export const mergeChildMarketsIntoEvent = <
  TEvent extends SportsFeedEvent,
  TMarket extends SportsFeedMarket,
>(
  event: TEvent,
  childMarkets: TMarket[],
): TEvent => {
  const existingMarketIds = new Set(
    (event.markets ?? []).map((market) => market.id),
  );
  const newChildMarkets = childMarkets.filter(
    (market) => !existingMarketIds.has(market.id),
  );

  if (newChildMarkets.length === 0) {
    return event;
  }

  return {
    ...event,
    markets: [...(event.markets ?? []), ...newChildMarkets],
  };
};

const addWorldCupChildMarketsToFeedEvent = async (
  event: PolymarketApiEvent,
  fetchChildEvents: FetchChildEvents,
): Promise<PolymarketApiEvent> => {
  try {
    const childEvents = await fetchChildEvents({
      parentEventId: event.id,
    });
    const childMarkets = childEvents
      .filter(
        (childEvent) => String(childEvent.parentEventId) === String(event.id),
      )
      .flatMap((childEvent) => childEvent.markets ?? []);

    return mergeChildMarketsIntoEvent(event, childMarkets);
  } catch (childFetchError) {
    DevLogger.log(
      'Failed to fetch World Cup child markets, using feed event only:',
      childFetchError,
    );
    return event;
  }
};

export const resolveWorldCupFeedEvents = async (
  events: PolymarketApiEvent[],
  {
    extendedSportsMarketsLeagues,
    fetchChildEvents = fetchChildEventsFromGammaApi,
  }: ResolveWorldCupFeedEventsParams,
): Promise<PolymarketApiEvent[]> => {
  if (
    !events.some((event) =>
      shouldFetchWorldCupChildMarkets({
        event,
        extendedSportsMarketsLeagues,
      }),
    )
  ) {
    return events;
  }

  return Promise.all(
    events.map(async (event) => {
      if (
        !shouldFetchWorldCupChildMarkets({
          event,
          extendedSportsMarketsLeagues,
        })
      ) {
        return event;
      }

      return addWorldCupChildMarketsToFeedEvent(event, fetchChildEvents);
    }),
  );
};
