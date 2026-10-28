import { CommonActions, type NavigationState } from '@react-navigation/native';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import {
  PerpsMode,
  type PerpsMarketData,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Engine from '../../../Engine';
import ReduxService from '../../../redux';
import {
  selectIsFirstTimePerpsUser,
  selectPerpsLastViewedMarketSymbol,
} from '../../../../components/UI/Perps/selectors/perpsController';
import { selectPerpsProModeEnabledFlag } from '../../../../components/UI/Perps/selectors/featureFlags';
import {
  parsePerpsUtmFromPath,
  setPerpsUtmAttribution,
} from '../../../../components/UI/Perps/utils/perpsAnalyticsAttribution';
import {
  dropPerpsHomeFromStackHistory,
  getPerpsHomeNavigationTarget,
  PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  resolvePerpsHomeNavigationTarget,
} from '../../../../components/UI/Perps/utils/perpsModeSwitch';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../Analytics';
import { parseTimeToOpenSeconds } from '../legacy/handleAssetUrl';
import { TokenDetailsSource } from '../../../../components/UI/TokenDetails/constants/constants';
import { PriceAlertAnalytics } from '../../../../components/UI/Assets/PriceAlerts/constants';

interface HandlePerpsUrlParams {
  perpsPath: string;
  /**
   * Warm-path signal that Pro mode was persisted. Cold start does not pass
   * this; Lite-home history cleanup only applies when an existing Perps stack
   * can still contain Home.
   */
  onProModeActivated?: (activated: boolean) => void;
}

/**
 * Maps URL tab parameter to internal MarketTypeFilter values
 * - 'all' → 'all' (shows all markets)
 * - 'crypto' → 'crypto' (crypto-only markets)
 * - 'stocks' → 'stock' (HIP3 equities; URL key kept for backward compat)
 * - 'commodities' → 'commodity' (HIP3 commodities; URL key kept for backward compat)
 * - 'forex' → 'forex' (HIP3 forex)
 * - 'new' → 'new' (uncategorized HIP3 markets)
 */
const TAB_TO_FILTER_MAP: Record<string, MarketTypeFilter> = {
  all: 'all',
  crypto: 'crypto',
  stocks: 'stock',
  commodities: 'commodity',
  forex: 'forex',
  new: 'new',
};

/**
 * Extensible interface for parsed perps navigation parameters
 * Supports current screens and can be easily extended for future screens
 */
interface PerpsNavigationParams {
  screen?: 'tabs' | 'home' | 'markets' | 'market-list' | 'asset' | 'tutorial';
  symbol?: string;
  /** Market category tab filter: 'all' | 'crypto' | 'stock' */
  tab?: string;
  /** `pro` asks the handler to persist Pro mode before opening the screen. */
  mode?: string;
}

const readPerpsQueryParams = (perpsPath: string): URLSearchParams =>
  new URLSearchParams(perpsPath.includes('?') ? perpsPath.split('?')[1] : '');

/**
 * Parse URL parameters into typed navigation parameters
 * @param perpsPath The perps URL path with query parameters
 * @returns Typed navigation parameters
 */
const parsePerpsNavigationParams = (
  perpsPath: string,
): PerpsNavigationParams => {
  const urlParams = readPerpsQueryParams(perpsPath);

  return {
    screen:
      (urlParams.get('screen') as PerpsNavigationParams['screen']) || undefined,
    symbol: urlParams.get('symbol') || undefined,
    tab: urlParams.get('tab') || undefined,
    mode: urlParams.get('mode') || undefined,
  };
};

/**
 * A `mode=pro` query param asks to persist Pro mode (e.g.
 * `perps-asset?symbol=ETH&mode=pro` or `perps?screen=asset&mode=pro`). The
 * remote flag still gates the layout, so a disabled flag leaves the current
 * mode unchanged.
 */
const shouldActivateProMode = (perpsPath: string): boolean =>
  readPerpsQueryParams(perpsPath).get('mode') === 'pro' &&
  selectPerpsProModeEnabledFlag(ReduxService.store.getState());

const activateProMode = (): boolean => {
  try {
    Engine.context.PerpsController.setPerpsMode(PerpsMode.Pro);
    return true;
  } catch (error) {
    DevLogger.log('[handlePerpsUrl] Failed to set Pro mode:', error);
    return false;
  }
};

interface DeeplinkStackState {
  key?: string;
  index: number;
  routes: {
    key?: string;
    name: string;
    params?: object;
    state?: DeeplinkStackState;
  }[];
}

const isDeeplinkStackState = (value: unknown): value is DeeplinkStackState =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'routes' in value &&
      Array.isArray((value as DeeplinkStackState).routes),
  );

/**
 * The Perps stack that still contains Lite home. Root `getState()` is the
 * main stack, so Home is one level down on `Routes.PERPS.ROOT`.
 */
const findPerpsStackContainingHome = (
  state: DeeplinkStackState | undefined,
): DeeplinkStackState | undefined => {
  if (!state?.routes) {
    return undefined;
  }

  for (const route of state.routes) {
    if (route.name === Routes.PERPS.ROOT && isDeeplinkStackState(route.state)) {
      const containsHome = route.state.routes.some(
        (entry) => entry.name === Routes.PERPS.PERPS_HOME,
      );
      if (containsHome) {
        return route.state;
      }
    }
    if (isDeeplinkStackState(route.state)) {
      const nested = findPerpsStackContainingHome(route.state);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
};

/**
 * `navigate` on NavigationService is deferred to the next frame. Read the
 * stack after that frame so Home is dropped only once the requested market
 * is already on it. `dropPerpsHomeFromStackHistory` no-ops when Home is the
 * only entry, which would be the pre-navigate stack.
 */
const scheduleDropPerpsHomeFromDeeplinkHistory = (): void => {
  requestAnimationFrame(() => {
    try {
      const navigation = NavigationService.navigation;
      if (typeof navigation.getState !== 'function') {
        return;
      }
      const perpsState = findPerpsStackContainingHome(
        navigation.getState() as DeeplinkStackState | undefined,
      );
      if (!perpsState?.key) {
        return;
      }
      dropPerpsHomeFromStackHistory({
        getState: () => perpsState as NavigationState,
        reset: (nextState) => {
          if (typeof navigation.dispatch !== 'function') {
            return;
          }
          navigation.dispatch({
            ...CommonActions.reset(nextState),
            target: perpsState.key,
          });
        },
      });
    } catch (error) {
      DevLogger.log(
        '[handlePerpsUrl] Failed to drop Lite home from history:',
        error,
      );
    }
  });
};

/**
 * Parse HIP-3 symbol format (dex:symbol) into marketSource and symbol
 * @param rawSymbol The raw symbol which may be in HIP-3 format (e.g., 'xyz:TSLA')
 * @returns Object with marketSource (if HIP-3) and parsed symbol
 */
const parseHip3Symbol = (
  rawSymbol: string,
): { marketSource?: string; symbol: string } => {
  if (rawSymbol.includes(':')) {
    const [marketSource, symbol] = rawSymbol.split(':');
    return {
      marketSource: marketSource.toLowerCase(),
      symbol: symbol.toUpperCase(),
    };
  }
  return { symbol: rawSymbol.toUpperCase() };
};

/**
 * Build a minimal market object from a raw asset symbol.
 * Supports both standard crypto symbols (BTC, ETH) and HIP-3 format (xyz:TSLA).
 * The PerpsMarketDetailsView fetches the full data; we only need the symbol
 * (and optional marketSource for HIP-3) to route.
 * @param rawSymbol The asset symbol (may include a dex prefix for HIP-3)
 */
const buildPerpsMarket = (rawSymbol: string): PerpsMarketData => {
  const { marketSource, symbol } = parseHip3Symbol(rawSymbol);

  if (marketSource) {
    DevLogger.log('[handlePerpsUrl] Detected HIP-3 market:', {
      marketSource,
      symbol,
    });
  }

  // Use combined format (dex:symbol) for HIP-3 to match API format
  return {
    symbol: marketSource ? `${marketSource}:${symbol}` : symbol,
    name: symbol,
    price: '0',
    change24h: '0',
    change24hPercent: '0',
    volume24h: '0',
    volume: '0',
    fundingRate: 0,
    openInterest: '0',
    maxLeverage: '100',
    logoUrl: '',
    nextFundingTime: 0,
    fundingIntervalHours: 8,
    ...(marketSource && { marketSource }),
  } as PerpsMarketData;
};

/**
 * Build a `main-stack` target into the Perps stack for a specific screen.
 */
const perpsScreenTarget = (
  screen: string,
  params: object,
): DeeplinkIntent['target'] => ({
  type: 'main-stack',
  routeName: Routes.PERPS.ROOT,
  params: { screen, params: { source: 'deeplink', ...params } },
});

/**
 * Build the Perps home target. While Pro mode is active this resolves to
 * the default Pro market instead of `PerpsHomeView`, which must never be
 * shown while Pro mode is on (TAT-3612).
 */
/**
 * Home while the current mode is Lite is `PerpsHomeView`. When this link will
 * persist Pro before navigation, resolve the Pro home market now — reading
 * the store still sees Lite because `prepare` has not run.
 */
const perpsHomeTarget = (activatePro: boolean): DeeplinkIntent['target'] => {
  const state = ReduxService.store.getState();
  const { screen, params } = activatePro
    ? resolvePerpsHomeNavigationTarget(
        true,
        {},
        selectPerpsLastViewedMarketSymbol(state),
      )
    : getPerpsHomeNavigationTarget(state);
  return perpsScreenTarget(screen, params);
};

/**
 * Resolve the navigation target for a perps deeplink.
 *
 * Supported URL formats:
 * - https://link.metamask.io/perps                                    → Wallet home with Perps tab
 * - https://link.metamask.io/perps?screen=tabs                        → Wallet home with Perps tab
 * - https://link.metamask.io/perps?screen=home                        → PerpsHomeView (explicit)
 * - https://link.metamask.io/perps?screen=markets                     → PerpsHomeView (backwards compat)
 * - https://link.metamask.io/perps?screen=market-list                 → PerpsMarketListView (all markets)
 * - https://link.metamask.io/perps?screen=market-list&tab=all         → PerpsMarketListView (all markets)
 * - https://link.metamask.io/perps?screen=market-list&tab=crypto      → PerpsMarketListView (crypto only)
 * - https://link.metamask.io/perps?screen=market-list&tab=stocks      → PerpsMarketListView (HIP3 stocks)
 * - https://link.metamask.io/perps?screen=asset&symbol=BTC            → PerpsMarketDetailsView (crypto)
 * - https://link.metamask.io/perps?screen=asset&symbol=xyz:TSLA       → PerpsMarketDetailsView (HIP3)
 * - https://link.metamask.io/perps-asset?symbol=ETH&mode=pro          → Pro mode, ETH market
 * - https://link.metamask.io/perps-asset?mode=pro                     → Pro mode, BTC market (default)
 * - https://link.metamask.io/perps?screen=asset&mode=pro&symbol=ETH   → Pro mode, ETH market
 *
 * Navigation behavior:
 * - First-time users: Always navigate to tutorial (regardless of parameters)
 * - Returning users: Route based on screen parameter
 * - No screen param: Defaults to screen=tabs behavior
 * - screen=tabs: Navigate to wallet home with Perps tab selected
 * - screen=home: Navigate directly to PerpsHomeView, or the Pro home market when mode=pro will be persisted
 * - screen=markets: Navigate to PerpsHomeView (backwards compatibility), or the Pro home market when mode=pro will be persisted
 * - screen=market-list: Navigate to PerpsMarketListView with optional tab filter
 * - screen=asset&symbol=X: Navigate directly to asset market details
 *
 * HIP-3 Symbol Format:
 * - Standard crypto: 'BTC', 'ETH'
 * - HIP-3 (dex:symbol): 'xyz:TSLA', 'xyz:xyz100' → marketSource='xyz'
 */
const resolvePerpsTarget = ({
  perpsPath,
}: HandlePerpsUrlParams): DeeplinkIntent['target'] => {
  // Parse navigation parameters from URL
  const navParams = parsePerpsNavigationParams(perpsPath);
  DevLogger.log('[handlePerpsUrl] Parsed navigation parameters:', navParams);

  // Check if user is first-time perps user - always goes to tutorial first
  const isFirstTime = selectIsFirstTimePerpsUser(ReduxService.store.getState());
  DevLogger.log('[handlePerpsUrl] isFirstTimeUser:', isFirstTime);

  if (isFirstTime) {
    DevLogger.log(
      '[handlePerpsUrl] First-time user, navigating to tutorial regardless of URL parameters',
    );
    return {
      type: 'main-stack',
      routeName: Routes.PERPS.TUTORIAL,
      params: { isFromDeeplink: true },
    };
  }

  // Mode is persisted in `prepare`, after this target is chosen. Home and
  // markets must follow the mode that navigation will actually run under.
  const activatePro = shouldActivateProMode(perpsPath);

  // Returning users: route based on screen parameter
  switch (navParams.screen) {
    case 'home':
      // Explicit navigation to Perps home (Lite hub, or the Pro market).
      DevLogger.log('[handlePerpsUrl] Navigating to Perps home');
      return perpsHomeTarget(activatePro);

    case 'markets':
      // Backwards compatibility: screen=markets → Perps home
      DevLogger.log(
        '[handlePerpsUrl] Navigating to Perps home (backwards compat)',
      );
      return perpsHomeTarget(activatePro);

    case 'market-list': {
      // Navigate to PerpsMarketListView with optional market type filter
      const marketTypeFilter =
        navParams.tab &&
        Object.prototype.hasOwnProperty.call(TAB_TO_FILTER_MAP, navParams.tab)
          ? TAB_TO_FILTER_MAP[navParams.tab]
          : undefined;
      DevLogger.log(
        '[handlePerpsUrl] Navigating to PerpsMarketListView with filter:',
        marketTypeFilter,
      );
      return perpsScreenTarget(Routes.PERPS.MARKET_LIST, {
        ...(marketTypeFilter && { defaultMarketTypeFilter: marketTypeFilter }),
      });
    }

    case 'asset': {
      DevLogger.log('[handlePerpsUrl] Navigating to asset details');
      const rawSymbol =
        navParams.symbol ||
        (navParams.mode === 'pro' ? PERPS_DEFAULT_PRO_MARKET_SYMBOL : '');
      if (!rawSymbol) {
        DevLogger.log(
          '[handlePerpsUrl] No symbol provided, fallback to markets list',
        );
        return perpsHomeTarget(activatePro);
      }
      return perpsScreenTarget(Routes.PERPS.MARKET_DETAILS, {
        market: buildPerpsMarket(rawSymbol),
      });
    }

    case 'tabs':
    default:
      // No screen parameter: default to tabs behavior for consistency. The
      // Wallet home reads these params via useHomeDeepLinkEffects and selects
      // the Perps tab once focused.
      /* DevLogger.log(
        '[handlePerpsUrl] Navigating to wallet home with perps tab selected',
      ); */
      DevLogger.log(
        '[handlePerpsUrl] Navigating to wallet home with perps tab selected',
      );
      return {
        type: 'home-tab',
        routeName: Routes.WALLET.HOME,
        params: {
          initialTab: 'perps',
          shouldSelectPerpsTab: true,
          ...(navParams.tab && { specificTab: navParams.tab }),
        },
      };
  }
};

/**
 * Fires `PRICE_ALERT_NOTIFICATION_OPENED` when a perps deeplink originates from
 * a price-alert push notification (`source=price_alert_notification`, `screen=asset`).
 *
 * Called exclusively via `createPerpsDeeplinkIntent`, which is on the execution path
 * for both cold-start (locked/killed app — called directly from handleUniversalLink)
 * and warm (app already running — called from handlePerpsUrl → executeDeeplinkIntent).
 */
const trackPriceAlertNotificationIfApplicable = (perpsPath: string): void => {
  try {
    const urlParams = readPerpsQueryParams(perpsPath);
    const source = urlParams.get('source');
    const screen = urlParams.get('screen');
    if (
      source === TokenDetailsSource.PriceAlertNotification &&
      screen === 'asset'
    ) {
      const rawSymbol = urlParams.get('symbol') ?? '';
      // Strip any dex prefix (e.g. "xyz:XYZ100" → "XYZ100") for the display symbol.
      const displaySymbol = rawSymbol.includes(':')
        ? rawSymbol.split(':')[1]
        : rawSymbol;
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PRICE_ALERT_NOTIFICATION_OPENED,
        )
          .addProperties({
            asset_id: rawSymbol,
            token_symbol: displaySymbol.toUpperCase(),
            alert_type: urlParams.get('alert_type'),
            alert_market_type: PriceAlertAnalytics.MARKET_TYPE.PERPS,
            price_at_trigger: Number.parseFloat(
              urlParams.get('price_at_trigger') as string,
            ),
            time_to_open: parseTimeToOpenSeconds(urlParams.get('triggered_at')),
          })
          .build(),
      );
    }
  } catch {
    // Analytics must never block notification navigation.
  }
};

export const createPerpsDeeplinkIntent = ({
  perpsPath,
  onProModeActivated,
}: HandlePerpsUrlParams): DeeplinkIntent => {
  // Track notification-opened on every entry path:
  //  - Cold/startup path: called directly from handleUniversalLink (locked/killed app)
  //  - Warm path: called via handlePerpsUrl → executeDeeplinkIntent (app already running)
  trackPriceAlertNotificationIfApplicable(perpsPath);
  return {
    target: resolvePerpsTarget({ perpsPath }),
    // prepare runs before navigation on both the warm and cold-start paths,
    // so the market screen mounts the Pro layout once. The destination above
    // already uses this same requested mode, so it does not wait on prepare.
    ...(shouldActivateProMode(perpsPath) && {
      prepare: () => {
        const activated = activateProMode();
        onProModeActivated?.(activated);
      },
    }),
  };
};

export const handlePerpsUrl = async ({ perpsPath }: HandlePerpsUrlParams) => {
  DevLogger.log(
    '[handlePerpsUrl] Starting perps deeplink handling with path:',
    perpsPath,
  );

  // Propagate UTM params into controller attribution context.
  try {
    setPerpsUtmAttribution(parsePerpsUtmFromPath(perpsPath));
    // Attribution is best-effort: Engine/controller may be unavailable during
    // early deeplink handling; never block navigation if UTM write fails.
  } catch (attributionError) {
    DevLogger.log(
      '[handlePerpsUrl] Failed to set attribution context:',
      attributionError,
    );
  }

  let proModeActivated = false;
  const intent = createPerpsDeeplinkIntent({
    perpsPath,
    onProModeActivated: (activated) => {
      proModeActivated = activated;
    },
  });

  try {
    // createPerpsDeeplinkIntent calls trackPriceAlertNotificationIfApplicable
    // internally, covering both warm (here) and cold/startup paths consistently.
    await executeDeeplinkIntent(intent);
    // Drop Lite home only after the market is on the stack. A single Home
    // entry cannot be removed first: that reset would leave Perps with no
    // screen. Cold start builds a fresh stack and does not come through here.
    if (
      proModeActivated &&
      intent.target.type === 'main-stack' &&
      intent.target.routeName === Routes.PERPS.ROOT
    ) {
      scheduleDropPerpsHomeFromDeeplinkHistory();
    }
  } catch (error) {
    DevLogger.log('Failed to handle perps deeplink:', error);
    // Fallback to markets list on error
    const { screen, params } = getPerpsHomeNavigationTarget(
      ReduxService.store.getState(),
      { source: 'deeplink' },
    );
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen,
      params,
    });
  }
};
