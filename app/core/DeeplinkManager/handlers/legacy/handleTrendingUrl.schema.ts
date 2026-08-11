import {
  enums,
  nonempty,
  string,
  validate,
  type Infer,
  type Struct,
} from '@metamask/superstruct';
import { CaipChainIdStruct } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import {
  EXPLORE_TAB_INDEX,
  type ExploreTabIndex,
} from '../../../../constants/navigation/exploreTabIndices';
import type { TimeOption } from '../../../../components/UI/Trending/components/TrendingTokensBottomSheet';
import type { TrendingTokensFullViewParams } from '../../../../components/UI/Trending/Views/TrendingTokensFullView/TrendingTokensFullView';
import type { ExploreFeedRouteParams } from '../../../../components/Views/TrendingView/TrendingView';
import type { ExploreSearchRouteParams } from '../../../../components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen.types';
import type { RootStackParamList } from '../../../NavigationService/types';

/**
 * Reads a query param, or `undefined` when it is missing or holds a value the
 * schema does not accept. Bad values are dropped rather than failing the
 * deeplink, so the destination still opens with its own defaults.
 */
const readParam = <Value>(
  urlParams: URLSearchParams,
  key: string,
  schema: Struct<Value, unknown>,
): Value | undefined => {
  const rawValue = urlParams.get(key)?.trim();
  if (!rawValue) {
    return undefined;
  }
  const [, value] = validate(rawValue, schema, { coerce: true });
  return value;
};

/** `?screen=` values. e.g. https://link.metamask.io/trending?screen=search */
const ExploreScreenSchema = enums([
  'stocks',
  'trending-tokens',
  'sites',
  'favorite-sites',
  'search',
]);

/** `?tab=` values. e.g. https://link.metamask.io/trending?tab=crypto */
const ExploreTabSchema = enums([
  'now',
  'macro',
  'rwas',
  'crypto',
  'sports',
  'sites',
]);

/** A full-screen view reachable from Explore, i.e. a `?screen=` destination. */
export interface ExploreScreenRoute {
  route: string;
  /** Builds the view's route params from the query string. */
  getParams?: (
    urlParams: URLSearchParams,
  ) => Partial<
    | TrendingTokensFullViewParams
    | ExploreSearchRouteParams
    | RootStackParamList['SitesFullView']
  >;
}

/** A tab of the Explore feed, i.e. a `?tab=` destination. */
export interface ExploreTabRoute {
  index: ExploreTabIndex;
  /** Builds any extra feed params from the query string. */
  getParams?: (urlParams: URLSearchParams) => Partial<ExploreFeedRouteParams>;
}

/** Where each `?screen=` value leads, and which query params it reads. */
const EXPLORE_SCREENS: Record<
  Infer<typeof ExploreScreenSchema>,
  ExploreScreenRoute
> = {
  // ?screen=stocks
  stocks: {
    route: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
  },

  // ?screen=trending-tokens
  //   &chainId=
  //   &timeframe=
  'trending-tokens': {
    route: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
    getParams: (urlParams): TrendingTokensFullViewParams => {
      const chainId = readParam(urlParams, 'chainId', CaipChainIdStruct);
      const timeframe = readParam(
        urlParams,
        'timeframe',
        enums(['5m', '1h', '6h', '24h']),
      );

      return {
        // The view filters on a list of chains; the deeplink exposes one.
        ...(chainId && { initialNetwork: [chainId] }),
        ...(timeframe && { initialTimeOption: timeframe as TimeOption }),
      };
    },
  },

  // ?screen=sites
  sites: {
    route: Routes.SITES_FULL_VIEW,
  },

  // ?screen=favorite-sites
  'favorite-sites': {
    route: Routes.SITES_FULL_VIEW,
    getParams: (): RootStackParamList['SitesFullView'] => ({
      mode: 'favorites',
    }),
  },

  // ?screen=search
  //   &q= || &query=
  search: {
    route: Routes.EXPLORE_SEARCH,
    getParams: (urlParams): ExploreSearchRouteParams => {
      const query =
        readParam(urlParams, 'q', nonempty(string())) ??
        readParam(urlParams, 'query', nonempty(string()));

      return { ...(query && { initialQuery: query }) };
    },
  },
};

const EXPLORE_TABS: Record<Infer<typeof ExploreTabSchema>, ExploreTabRoute> = {
  now: { index: EXPLORE_TAB_INDEX.NOW },
  macro: { index: EXPLORE_TAB_INDEX.MACRO },
  rwas: { index: EXPLORE_TAB_INDEX.RWAS },
  crypto: { index: EXPLORE_TAB_INDEX.CRYPTO },
  sports: { index: EXPLORE_TAB_INDEX.SPORTS },
  sites: { index: EXPLORE_TAB_INDEX.SITES },
};

/** The full-screen view a URL asks for, if `?screen=` names a known one. */
export function getExploreScreen(
  urlParams: URLSearchParams,
): ExploreScreenRoute | undefined {
  const screen = readParam(urlParams, 'screen', ExploreScreenSchema);
  return screen && EXPLORE_SCREENS[screen];
}

/** The Explore feed tab a URL asks for, if `?tab=` names a known one. */
export function getExploreTab(
  urlParams: URLSearchParams,
): ExploreTabRoute | undefined {
  const tab = readParam(urlParams, 'tab', ExploreTabSchema);
  return tab && EXPLORE_TABS[tab];
}
