import Routes from '../../../../constants/navigation/Routes';
import type { ExploreFeedRouteParams } from '../../../../components/Views/TrendingView/TrendingView';
import type {
  DeeplinkIntent,
  MainStackDeeplinkNavigationTarget,
} from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';
import {
  getExploreScreen,
  getExploreTab,
  type ExploreScreenRoute,
  type ExploreTabRoute,
} from './handleTrendingUrl.schema';

interface HandleTrendingUrlParams {
  actionPath: string;
}

/**
 * Entry surface reported to Explore analytics (`tab_switched.source`) when a
 * deeplink lands the user on a specific Explore tab.
 */
const DEEPLINK_ENTRY_SOURCE = 'deeplink';

/**
 * Full-screen views are MainNavigator stack screens above the tabs, so they are
 * main-stack targets. Back from them should return to the Explore tab, not
 * Wallet — matching in-app navigation, where they are entered from Explore.
 */
const screenTarget = (
  { route, getParams }: ExploreScreenRoute,
  urlParams: URLSearchParams,
): MainStackDeeplinkNavigationTarget => {
  const params = getParams?.(urlParams);
  const hasParams = params !== undefined && Object.keys(params).length > 0;

  return {
    type: 'main-stack',
    routeName: route,
    ...(hasParams && { params }),
    backTab: Routes.TRENDING_VIEW,
  };
};

const tabTarget = (
  { index, getParams }: ExploreTabRoute,
  urlParams: URLSearchParams,
): DeeplinkIntent['target'] => ({
  type: 'home-tab',
  routeName: Routes.TRENDING_VIEW,
  // The Explore tab hosts its own stack; the nested form targets the feed
  // screen inside it, which reads `initialTab` to preselect the tab.
  params: {
    screen: Routes.TRENDING_FEED,
    params: {
      initialTab: index,
      source: DEEPLINK_ENTRY_SOURCE,
      ...getParams?.(urlParams),
    } satisfies ExploreFeedRouteParams,
  },
});

const getUrlParams = (actionPath: string): URLSearchParams =>
  new URLSearchParams(actionPath.includes('?') ? actionPath.split('?')[1] : '');

/**
 * Resolves the trending/explore deeplink:
 * - `?screen=<view>` opens a full-screen view above the Explore tab.
 * - `?tab=<tab>` opens Explore with the given tab preselected.
 * - Anything else, including a value neither one accepts, falls back to the Explore tab on its default tab.
 *
 * The accepted values, and the query params each one reads, live in
 * `handleTrendingUrl.schema.ts`.
 */
export const createTrendingDeeplinkIntent = ({
  actionPath,
}: HandleTrendingUrlParams): DeeplinkIntent => {
  const urlParams = getUrlParams(actionPath);

  const screen = getExploreScreen(urlParams);
  if (screen) {
    return { target: screenTarget(screen, urlParams) };
  }

  const tab = getExploreTab(urlParams);
  if (tab) {
    return { target: tabTarget(tab, urlParams) };
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
