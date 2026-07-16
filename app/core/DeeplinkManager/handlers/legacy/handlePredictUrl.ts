import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import ReduxService from '../../../redux';
import {
  isPredictTabKey,
  type PredictTabKey,
} from '../../../../components/UI/Predict/constants/feedTabs';
import {
  PREDICT_WORLD_CUP_FEED_PARAM,
  resolvePredictWorldCupInitialTab,
  type PredictWorldCupTabKey,
} from '../../../../components/UI/Predict/constants/worldCupTabs';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../../../components/UI/Predict/constants/flags';
import {
  selectPredictHomeRedesignEnabledFlag,
  selectPredictWorldCupConfig,
} from '../../../../components/UI/Predict/selectors/featureFlags';
import type { PredictWorldCupConfig } from '../../../../components/UI/Predict/types/flags';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';
import {
  isPredictFeedId,
  type PredictFeedId,
} from '../../../../components/UI/Predict/constants/feedConfig';

interface HandlePredictUrlParams {
  predictPath: string;
  origin?: string;
}

/**
 * Interface for parsed predict navigation parameters
 */
interface PredictNavigationParams {
  market?: string; // Market ID
  utmSource?: string; // UTM source for analytics tracking
  tab?: PredictTabKey; // Feed tab (when no market param)
  // TODO: `worldCupTab` holds the raw (unvalidated) tab value and is also reused
  // by the generic feed. Remove/rename to a neutral field once the World Cup
  // feature is sunset.
  worldCupTab?: PredictWorldCupTabKey; // World Cup feed initial tab (raw tab value)
  feed?: string; // Dedicated feed key
  filter?: string; // Generic feed filter chip id (parsed separately from tab)
  query?: string; // Search query (when no market param)
}

/**
 * Parse URL parameters into typed navigation parameters
 * @param predictPath The predict URL path with query parameters
 * @returns Typed navigation parameters
 */
const parsePredictNavigationParams = (
  predictPath: string,
): PredictNavigationParams => {
  const urlParams = new URLSearchParams(
    predictPath.includes('?') ? predictPath.split('?')[1] : '',
  );

  const marketId = urlParams.get('market') || urlParams.get('marketId');
  const utmSource = urlParams.get('utm_source');
  const tabParam = urlParams.get('tab')?.toLowerCase();
  const tab = isPredictTabKey(tabParam) ? tabParam : undefined;
  const feed = urlParams.get('feed')?.toLowerCase();
  const filter = urlParams.get('filter')?.toLowerCase();
  const query = urlParams.get('query') || urlParams.get('q') || undefined;

  return {
    market: marketId || undefined,
    utmSource: utmSource || undefined,
    tab,
    worldCupTab: tabParam,
    feed: feed || undefined,
    filter: filter || undefined,
    query,
  };
};

const getPredictWorldCupConfig = (): PredictWorldCupConfig => {
  try {
    return selectPredictWorldCupConfig(ReduxService.store.getState());
  } catch (error) {
    DevLogger.log(
      '[handlePredictUrl] Unable to read World Cup config, using default:',
      error,
    );
    return DEFAULT_PREDICT_WORLD_CUP_FLAG;
  }
};

const getPredictHomeRedesignEnabled = (): boolean => {
  try {
    return selectPredictHomeRedesignEnabledFlag(ReduxService.store.getState());
  } catch (error) {
    DevLogger.log(
      '[handlePredictUrl] Unable to read home redesign flag, defaulting to disabled:',
      error,
    );
    return false;
  }
};

const getMarketListParams = ({
  entryPoint,
  tab,
  query,
}: {
  entryPoint: string;
  tab?: PredictTabKey;
  query?: string;
}) => ({
  entryPoint,
  ...(tab && { tab }),
  ...(query && { query }),
});

/**
 * Build a `main-stack` target into the Predict stack for a specific screen.
 */
const predictTarget = (
  screen: string,
  params: object,
): DeeplinkIntent['target'] => ({
  type: 'main-stack',
  routeName: Routes.PREDICT.ROOT,
  params: { screen, params },
});

const marketListTarget = ({
  entryPoint,
  tab,
  query,
}: {
  entryPoint: string;
  tab?: PredictTabKey;
  query?: string;
}): DeeplinkIntent['target'] =>
  predictTarget(
    Routes.PREDICT.MARKET_LIST,
    getMarketListParams({ entryPoint, tab, query }),
  );

const worldCupTarget = ({
  requestedTab,
  entryPoint,
}: {
  requestedTab?: PredictWorldCupTabKey;
  entryPoint: string;
}): DeeplinkIntent['target'] => {
  const config = getPredictWorldCupConfig();

  if (config.enabled && config.showWorldCupScreen) {
    return predictTarget(Routes.PREDICT.WORLD_CUP, {
      entryPoint,
      initialTab: resolvePredictWorldCupInitialTab(requestedTab, config),
    });
  }

  DevLogger.log(
    '[handlePredictUrl] World Cup screen disabled, fallback to market list',
  );
  return marketListTarget({ entryPoint });
};

/**
 * Build the target for a generic, config-driven Predict feed (`PredictFeedView`).
 * @param params Resolved generic feed params
 */
const genericFeedTarget = ({
  feedId,
  initialTabId,
  initialFilterId,
  query,
  entryPoint,
}: {
  feedId: PredictFeedId;
  initialTabId?: string;
  initialFilterId?: string;
  query?: string;
  entryPoint: string;
}): DeeplinkIntent['target'] => {
  DevLogger.log('[handlePredictUrl] Navigating to generic feed:', feedId);

  return predictTarget(Routes.PREDICT.FEED, {
    feedId,
    ...(initialTabId && { initialTabId }),
    ...(initialFilterId && { initialFilterId }),
    ...(query && { query }),
    entryPoint,
  });
};

/**
 * Resolve the target for market-specific navigation
 * @param marketId The market ID to navigate to
 * @param entryPoint The entry point for analytics tracking
 */
const marketTarget = (
  marketId: string,
  entryPoint: string,
): DeeplinkIntent['target'] => {
  DevLogger.log(
    '[handlePredictUrl] Navigating to market details for market:',
    marketId,
  );

  if (!marketId) {
    DevLogger.log(
      '[handlePredictUrl] No market ID provided, fallback to market list',
    );
    return marketListTarget({ entryPoint });
  }

  return predictTarget(Routes.PREDICT.MARKET_DETAILS, {
    marketId,
    entryPoint,
  });
};

/**
 * Predict deeplink handler
 *
 * @param params Object containing the predict path and origin
 *
 * Supported URL formats:
 * - https://metamask.app.link/predict
 * - https://metamask.app.link/predict?market=23246
 * - https://metamask.app.link/predict?marketId=23246
 * - https://metamask.app.link/predict?market=23246&utm_source=test
 * - https://link.metamask.io/predict?market=23246
 * - https://link.metamask.io/predict?marketId=23246
 * - https://link.metamask.io/predict?tab=crypto
 * - https://link.metamask.io/predict?q=bitcoin
 * - https://link.metamask.io/predict?query=bitcoin
 * - https://link.metamask.io/predict?feed=world-cup
 * - https://link.metamask.io/predict?feed=world-cup&tab=live
 * - https://link.metamask.io/predict?feed=sports
 * - https://link.metamask.io/predict?feed=sports&tab=all&filter=live
 * - https://link.metamask.io/predict?feed=popular-today&filter=elections (redirects to Trending)
 * - https://link.metamask.io/predict?feed=trending&q=bitcoin
 *
 * Origin/EntryPoint handling:
 * - Base entryPoint is origin if provided, otherwise 'deeplink'
 * - If utm_source is present, always appends '_' + utm_source to the base
 * - Examples: 'deeplink', 'deeplink_test', 'carousel_twitter', 'notification_campaign'
 *
 * Navigation behavior:
 * - No market param: Navigate to market list
 * - market=X or marketId=X: Navigate directly to market details for market X
 * - feed=world-cup: Navigate to the dedicated World Cup feed when enabled
 * - feed=<known generic id> (sports/politics/crypto/live/trending): Navigate to the generic PredictFeedView when the predictHomeRedesign flag is enabled (tab -> initialTabId, filter -> initialFilterId)
 * - feed=popular-today: Redirect to the Trending feed while preserving its filter
 * - Unknown feed (or flag disabled): Fall back to the Predict market list
 * - Optional tab param when no market: Open feed on a specific tab
 * - query=X or q=X: Open feed with search overlay showing results for X
 */
const resolvePredictTarget = ({
  predictPath,
  origin,
}: HandlePredictUrlParams): DeeplinkIntent['target'] => {
  // Parse navigation parameters from URL
  const navParams = parsePredictNavigationParams(predictPath);
  DevLogger.log('[handlePredictUrl] Parsed navigation parameters:', navParams);
  const genericFeed =
    navParams.feed === 'popular-today' ? 'trending' : navParams.feed;

  // Determine entry point:
  // - Base is origin if provided, otherwise 'deeplink'
  // - If utm_source is present and different from base, append '_' + utm_source
  // - If utm_source equals base, don't append (avoid 'deeplink_deeplink')
  // - Examples: 'deeplink_test', 'carousel_twitter', 'notification_campaign'
  const baseEntryPoint = origin || 'deeplink';
  const shouldAppendUtmSource =
    navParams.utmSource && navParams.utmSource !== baseEntryPoint;
  const entryPoint = shouldAppendUtmSource
    ? `${baseEntryPoint}_${navParams.utmSource}`
    : baseEntryPoint;
  DevLogger.log('[handlePredictUrl] Entry point:', entryPoint);

  if (navParams.market) {
    return marketTarget(navParams.market, entryPoint);
  } else if (navParams.feed === PREDICT_WORLD_CUP_FEED_PARAM) {
    return worldCupTarget({
      requestedTab: navParams.worldCupTab,
      entryPoint,
    });
  } else if (isPredictFeedId(genericFeed) && getPredictHomeRedesignEnabled()) {
    return genericFeedTarget({
      feedId: genericFeed,
      // worldCupTab holds the raw (unvalidated) tab value; the generic feed's
      // sub-tab ids (e.g. basketball/all/live) are resolved by the view.
      initialTabId: navParams.worldCupTab,
      initialFilterId: navParams.filter,
      query: navParams.query,
      entryPoint,
    });
  }
  DevLogger.log('[handlePredictUrl] No market parameter, showing list');
  return marketListTarget({
    entryPoint,
    tab: navParams.tab,
    query: navParams.query,
  });
};

export const createPredictDeeplinkIntent = ({
  predictPath,
  origin,
}: HandlePredictUrlParams): DeeplinkIntent => ({
  target: resolvePredictTarget({ predictPath, origin }),
});

export const handlePredictUrl = async ({
  predictPath,
  origin,
}: HandlePredictUrlParams) => {
  DevLogger.log(
    '[handlePredictUrl] Starting predict deeplink handling with path:',
    predictPath,
    'origin:',
    origin,
  );

  try {
    await executeDeeplinkIntent(
      createPredictDeeplinkIntent({ predictPath, origin }),
    );
  } catch (error) {
    DevLogger.log('Failed to handle predict deeplink:', error);
    // Fallback to market list on error
    // Default to 'deeplink' entry point for error fallback
    NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { entryPoint: 'deeplink' },
    });
  }
};
