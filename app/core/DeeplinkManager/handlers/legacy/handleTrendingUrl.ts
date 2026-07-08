import Routes from '../../../../constants/navigation/Routes';
import {
  EXPLORE_TAB_INDEX,
  type ExploreTabIndex,
} from '../../../../constants/navigation/exploreTabIndices';
import type { ExploreFeedRouteParams } from '../../../../components/Views/TrendingView/TrendingView';
import type { ExploreSearchRouteParams } from '../../../../components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.types';
import type { RootStackParamList } from '../../../NavigationService/types';
import type {
  DeeplinkIntent,
  MainStackDeeplinkNavigationTarget,
} from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

interface HandleTrendingUrlParams {
  actionPath: string;
}

/** Query params supported by the trending/explore deeplink. */
const TRENDING_QUERY_PARAM = {
  /** Selects a full-screen view pushed above the Explore tab. */
  SCREEN: 'screen',
  /** Selects a tab inside the Explore (Trending) view. */
  TAB: 'tab',
  /** Prefills Explore search when used with `screen=search`. */
  QUERY: 'q',
  QUERY_ALT: 'query',
} as const;

/**
 * Entry surface reported to Explore analytics (`tab_switched.source`) when a
 * deeplink lands the user on a specific Explore tab.
 */
const DEEPLINK_ENTRY_SOURCE = 'deeplink';

/**
 * `?tab=` values — one per tab of the Explore (Trending) view.
 * e.g. https://link.metamask.io/trending?tab=crypto
 */
export const EXPLORE_TAB_DEEPLINK_PARAM = {
  NOW: 'now',
  MACRO: 'macro',
  RWAS: 'rwas',
  CRYPTO: 'crypto',
  SPORTS: 'sports',
  SITES: 'sites',
} as const;

export type ExploreTabDeeplinkParam =
  (typeof EXPLORE_TAB_DEEPLINK_PARAM)[keyof typeof EXPLORE_TAB_DEEPLINK_PARAM];

const EXPLORE_TAB_PARAM_TO_INDEX: Record<
  ExploreTabDeeplinkParam,
  ExploreTabIndex
> = {
  [EXPLORE_TAB_DEEPLINK_PARAM.NOW]: EXPLORE_TAB_INDEX.NOW,
  [EXPLORE_TAB_DEEPLINK_PARAM.MACRO]: EXPLORE_TAB_INDEX.MACRO,
  [EXPLORE_TAB_DEEPLINK_PARAM.RWAS]: EXPLORE_TAB_INDEX.RWAS,
  [EXPLORE_TAB_DEEPLINK_PARAM.CRYPTO]: EXPLORE_TAB_INDEX.CRYPTO,
  [EXPLORE_TAB_DEEPLINK_PARAM.SPORTS]: EXPLORE_TAB_INDEX.SPORTS,
  [EXPLORE_TAB_DEEPLINK_PARAM.SITES]: EXPLORE_TAB_INDEX.SITES,
};

/**
 * `?screen=` values — full-screen views reachable from Explore.
 * e.g. https://link.metamask.io/trending?screen=trending-tokens
 */
export const EXPLORE_SCREEN_DEEPLINK_PARAM = {
  STOCKS: 'stocks',
  TRENDING_TOKENS: 'trending-tokens',
  SITES: 'sites',
  FAVORITE_SITES: 'favorite-sites',
  SEARCH: 'search',
} as const;

export type ExploreScreenDeeplinkParam =
  (typeof EXPLORE_SCREEN_DEEPLINK_PARAM)[keyof typeof EXPLORE_SCREEN_DEEPLINK_PARAM];

const isExploreTabDeeplinkParam = (
  value: string,
): value is ExploreTabDeeplinkParam =>
  Object.values(EXPLORE_TAB_DEEPLINK_PARAM).includes(
    value as ExploreTabDeeplinkParam,
  );

const isExploreScreenDeeplinkParam = (
  value: string,
): value is ExploreScreenDeeplinkParam =>
  Object.values(EXPLORE_SCREEN_DEEPLINK_PARAM).includes(
    value as ExploreScreenDeeplinkParam,
  );

/**
 * These views are MainNavigator stack screens above the tabs, so they are
 * main-stack targets. Back from them should return to the Explore tab, not
 * Wallet — matching in-app navigation, where they are entered from Explore.
 */
const exploreFullScreenTarget = (
  routeName: string,
  params?: object,
): MainStackDeeplinkNavigationTarget => ({
  type: 'main-stack',
  routeName,
  ...(params && { params }),
  backTab: Routes.TRENDING_VIEW,
});

type ExploreScreenTargetBuilder = (
  urlParams: URLSearchParams,
) => MainStackDeeplinkNavigationTarget;

const getExploreSearchQueryParam = (
  urlParams: URLSearchParams,
): ExploreSearchRouteParams | undefined => {
  const query =
    urlParams.get(TRENDING_QUERY_PARAM.QUERY) ||
    urlParams.get(TRENDING_QUERY_PARAM.QUERY_ALT);
  const initialQuery = query?.trim();
  return initialQuery ? { initialQuery } : undefined;
};

const EXPLORE_SCREEN_TARGETS: Record<
  ExploreScreenDeeplinkParam,
  ExploreScreenTargetBuilder
> = {
  [EXPLORE_SCREEN_DEEPLINK_PARAM.STOCKS]: () =>
    exploreFullScreenTarget(Routes.WALLET.RWA_TOKENS_FULL_VIEW),
  [EXPLORE_SCREEN_DEEPLINK_PARAM.TRENDING_TOKENS]: () =>
    exploreFullScreenTarget(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW),
  [EXPLORE_SCREEN_DEEPLINK_PARAM.SITES]: () =>
    exploreFullScreenTarget(Routes.SITES_FULL_VIEW),
  [EXPLORE_SCREEN_DEEPLINK_PARAM.FAVORITE_SITES]: () =>
    exploreFullScreenTarget(Routes.SITES_FULL_VIEW, {
      mode: 'favorites',
    } satisfies RootStackParamList['SitesFullView']),
  [EXPLORE_SCREEN_DEEPLINK_PARAM.SEARCH]: (urlParams) =>
    exploreFullScreenTarget(
      Routes.EXPLORE_SEARCH,
      getExploreSearchQueryParam(urlParams),
    ),
};

const exploreTabTarget = (
  initialTab: ExploreTabIndex,
): DeeplinkIntent['target'] => ({
  type: 'home-tab',
  routeName: Routes.TRENDING_VIEW,
  // The Explore tab hosts its own stack; the nested form targets the feed
  // screen inside it, which reads `initialTab` to preselect the tab.
  params: {
    screen: Routes.TRENDING_FEED,
    params: {
      initialTab,
      source: DEEPLINK_ENTRY_SOURCE,
    } satisfies ExploreFeedRouteParams,
  },
});

const getUrlParams = (actionPath: string): URLSearchParams =>
  new URLSearchParams(actionPath.includes('?') ? actionPath.split('?')[1] : '');

/**
 * Resolves the trending/explore deeplink:
 * - `?screen=<view>` opens a full-screen view above the Explore tab (see {@link EXPLORE_SCREEN_DEEPLINK_PARAM}).
 * - `?screen=search&q=<query>` (or `query=`) opens Explore search with the query prefilled.
 * - `?tab=<tab>` opens Explore with the given tab preselected (see {@link EXPLORE_TAB_DEEPLINK_PARAM}).
 * - Anything else falls back to the Explore tab on its default tab.
 */
export const createTrendingDeeplinkIntent = ({
  actionPath,
}: HandleTrendingUrlParams): DeeplinkIntent => {
  const urlParams = getUrlParams(actionPath);
  const screenParam = urlParams.get(TRENDING_QUERY_PARAM.SCREEN)?.toLowerCase();
  const tabParam = urlParams.get(TRENDING_QUERY_PARAM.TAB)?.toLowerCase();

  if (screenParam && isExploreScreenDeeplinkParam(screenParam)) {
    return { target: EXPLORE_SCREEN_TARGETS[screenParam](urlParams) };
  }

  if (tabParam && isExploreTabDeeplinkParam(tabParam)) {
    return { target: exploreTabTarget(EXPLORE_TAB_PARAM_TO_INDEX[tabParam]) };
  }

  return {
    target: {
      type: 'home-tab',
      routeName: Routes.TRENDING_VIEW,
    },
  };
};

export async function handleTrendingUrl({
  actionPath,
}: HandleTrendingUrlParams) {
  await executeDeeplinkIntent(createTrendingDeeplinkIntent({ actionPath }));
}
