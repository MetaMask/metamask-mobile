import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  isMoneylineLikeMarketType,
  isTeamToAdvanceMarketType,
  WORLD_CUP_LEAGUE,
} from '../../constants/sports';
import { getMatchingSportTeam } from '../../utils/sports';
import { getEventLeague } from '../../utils/gameParser';
import type { PredictMarketGame } from '../../types';
import type { PolymarketApiEvent } from './types';
import { fetchChildEventsFromGammaApi } from './utils';

interface NegRiskSportsMarket {
  negRisk?: boolean;
  sportsMarketType?: string;
  groupItemTitle?: string;
}

interface SportsTeamLogoMarket extends NegRiskSportsMarket {
  sportsMarketType?: string;
}

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

const normalizeTeamLabel = (value?: string): string | undefined =>
  value?.trim().toLowerCase();

const isGenericTeamLabel = (label: string): boolean => {
  const normalizedLabel = normalizeTeamLabel(label);
  return (
    normalizedLabel === 'team to advance' ||
    normalizedLabel?.startsWith('draw') === true
  );
};

export const hasNegRiskMoneylineGroupItem = <T extends NegRiskSportsMarket>(
  market: T,
): market is T & { groupItemTitle: string } =>
  Boolean(
    market.negRisk &&
      isMoneylineLikeMarketType(market.sportsMarketType) &&
      market.groupItemTitle,
  );

export const resolveNegRiskMoneylineShortTitles = (
  market: NegRiskSportsMarket,
  game: PredictMarketGame,
): { yesShort?: string; noShort?: string } => {
  if (!hasNegRiskMoneylineGroupItem(market)) {
    return {};
  }

  if (market.groupItemTitle.toLowerCase().startsWith('draw')) {
    return { yesShort: 'Draw' };
  }

  const yesTeam = getMatchingSportTeam(market.groupItemTitle, game);
  if (!yesTeam) return {};

  const isHome = yesTeam.id === game.homeTeam.id;
  const noAbbr = isHome
    ? game.awayTeam.abbreviation
    : game.homeTeam.abbreviation;

  return { yesShort: yesTeam.abbreviation, noShort: noAbbr };
};

export const getNegRiskMoneylineTeamLogo = (
  market: NegRiskSportsMarket,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !hasNegRiskMoneylineGroupItem(market)) {
    return undefined;
  }

  if (market.groupItemTitle.toLowerCase().startsWith('draw')) {
    return undefined;
  }

  return getMatchingSportTeam(market.groupItemTitle, game)?.logo;
};

const hasSportsMarketTeamGroupItem = <T extends SportsTeamLogoMarket>(
  market: T,
): market is T & { groupItemTitle: string } =>
  Boolean(
    market.groupItemTitle &&
      (hasNegRiskMoneylineGroupItem(market) ||
        isTeamToAdvanceMarketType(market.sportsMarketType)),
  );

export const getSportsMarketTeamLogo = (
  market: SportsTeamLogoMarket,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !hasSportsMarketTeamGroupItem(market)) {
    return undefined;
  }

  if (isGenericTeamLabel(market.groupItemTitle)) {
    return undefined;
  }

  return getMatchingSportTeam(market.groupItemTitle, game)?.logo;
};

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
