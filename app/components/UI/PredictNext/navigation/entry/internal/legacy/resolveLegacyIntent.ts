import type { NavigatorScreenParams } from '@react-navigation/native';
import Routes from '../../../../../../../constants/navigation/Routes';
import type {
  PredictEntryPoint as LegacyPredictEntryPoint,
  PredictPositionsTabKey,
  PredictStackParamList,
} from '../../../../../Predict/types/navigation';
import type { PredictRootScreenParamList } from '../../../appRoutes';
import { isPredictTabKey } from '../../../../../Predict/constants/feedTabs';
import { resolvePredictFeedConfig } from '../../../../../Predict/constants/feedConfig';
import type { PredictHomeCategoriesConfig } from '../../../../../Predict/types/flags';
import { readPredictEventRef } from '../../eventRef';
import type {
  PredictEntryPoint,
  PredictIntent,
  PredictPortfolioIntentTab,
} from '../../intents';
import {
  ready,
  unavailable,
  type PredictIntentResolution,
} from '../../targets';

const LEGACY_POSITIONS_TABS: Record<
  PredictPortfolioIntentTab,
  PredictPositionsTabKey
> = {
  positions: 'positions',
  activity: 'history',
};

/**
 * Legacy route params type the entry point as the closed in-app union. A
 * link's entry point is the open `origin[_utm_source]` string the legacy
 * screens have always received from deep links, so it passes through as is.
 */
const withEntryPoint = (entryPoint?: PredictEntryPoint) =>
  entryPoint === undefined
    ? {}
    : { entryPoint: entryPoint as LegacyPredictEntryPoint };

/**
 * A legacy stack screen through the `Predict` root route. Empty params are
 * omitted, the way callers navigated before intents (`{ screen }` alone).
 */
const legacyScreen = <TScreen extends keyof PredictStackParamList>(
  screen: TScreen,
  params: NonNullable<PredictStackParamList[TScreen]>,
): PredictIntentResolution =>
  ready({
    kind: 'predict',
    params: (Object.keys(params).length > 0
      ? { screen, params }
      : { screen }) as NavigatorScreenParams<PredictRootScreenParamList>,
  });

/**
 * The legacy flags a V1 link's list parameters depend on: the generic feed
 * screen exists only with the home redesign, and its categories come from
 * `predictHomeCategories`.
 */
export interface LegacyLinkFeedContext {
  homeRedesignEnabled: boolean;
  homeCategories?: PredictHomeCategoriesConfig;
}

const NO_LEGACY_LINK_FEEDS: LegacyLinkFeedContext = {
  homeRedesignEnabled: false,
};

/**
 * A V1 link's list parameters, exactly as `handlePredictUrl` routed them
 * before intents: a known generic feed opens `PredictFeed` while the home
 * redesign is on (`popular-today` is Trending), anything else the market
 * list with a known `tab` and the `query`.
 */
const resolveLinkList = (
  intent: Extract<PredictIntent, { type: 'linkList' }>,
  { homeRedesignEnabled, homeCategories }: LegacyLinkFeedContext,
): PredictIntentResolution => {
  const feedId = intent.feed === 'popular-today' ? 'trending' : intent.feed;
  if (
    feedId &&
    homeRedesignEnabled &&
    resolvePredictFeedConfig(feedId, undefined, homeCategories)
  ) {
    return legacyScreen(Routes.PREDICT.FEED, {
      feedId,
      ...(intent.tab ? { initialTabId: intent.tab } : {}),
      ...(intent.filter ? { initialFilterId: intent.filter } : {}),
      ...(intent.query ? { query: intent.query } : {}),
      ...withEntryPoint(intent.entryPoint),
    });
  }
  return legacyScreen(Routes.PREDICT.MARKET_LIST, {
    ...withEntryPoint(intent.entryPoint),
    ...(isPredictTabKey(intent.tab) ? { tab: intent.tab } : {}),
    ...(intent.query ? { query: intent.query } : {}),
  });
};

/**
 * The legacy Polymarket branch: today's routes and params, unchanged. A
 * caller that moves to intents produces exactly the navigation it made
 * before, including its analytics params.
 */
export const resolveLegacyIntent = (
  intent: PredictIntent,
  linkFeeds: LegacyLinkFeedContext = NO_LEGACY_LINK_FEEDS,
): PredictIntentResolution => {
  switch (intent.type) {
    case 'home':
      return legacyScreen(Routes.PREDICT.MARKET_LIST, {
        ...withEntryPoint(intent.entryPoint),
        ...(intent.transactionActiveAbTests?.length
          ? { transactionActiveAbTests: intent.transactionActiveAbTests }
          : {}),
      });
    case 'feed':
      return legacyScreen(Routes.PREDICT.MARKET_LIST, {
        ...withEntryPoint(intent.entryPoint),
        tab: intent.category,
      });
    case 'event': {
      const eventRef = readPredictEventRef(intent.eventRef);
      if (eventRef.implementation !== 'legacy') {
        return unavailable('venueMismatch');
      }
      return ready({
        kind: 'legacyMarketDetails',
        params: {
          marketId: eventRef.marketId,
          providerId: eventRef.providerId,
          ...withEntryPoint(intent.entryPoint),
          ...(intent.titleSnapshot === undefined
            ? {}
            : { title: intent.titleSnapshot }),
          ...(intent.imageSnapshot === undefined
            ? {}
            : { image: intent.imageSnapshot }),
        },
      });
    }
    case 'portfolio':
      return legacyScreen(Routes.PREDICT.POSITIONS, {
        ...withEntryPoint(intent.entryPoint),
        ...(intent.tab
          ? { initialTab: LEGACY_POSITIONS_TABS[intent.tab] }
          : {}),
      });
    case 'linkList':
      return resolveLinkList(intent, linkFeeds);
    case 'feedScreen':
      // Feed Screens are PredictNext's; the legacy stack has none.
      return unavailable('unsupported');
    case 'addFunds':
      return ready({
        kind: 'predictModals',
        params:
          intent.autoDeposit === undefined
            ? { screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET }
            : {
                screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
                params: { autoDeposit: intent.autoDeposit },
              },
      });
  }
};
