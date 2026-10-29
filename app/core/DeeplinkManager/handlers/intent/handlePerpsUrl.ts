import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import {
  getPerpsDexFromSymbol,
  getPerpsDisplaySymbol,
  type PerpsMarketData,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Engine from '../../../Engine';
import ReduxService from '../../../redux';
import { selectIsFirstTimePerpsUser } from '../../../../components/UI/Perps/selectors/perpsController';
import { selectPerpsTerminalBackendEnabledFlag } from '../../../../components/UI/Perps/selectors/featureFlags';
import {
  parsePerpsUtmFromPath,
  setPerpsUtmAttribution,
} from '../../../../components/UI/Perps/utils/perpsAnalyticsAttribution';
import { getPerpsHomeNavigationTarget } from '../../../../components/UI/Perps/utils/perpsModeSwitch';
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
}

/**
 * Parse URL parameters into typed navigation parameters
 * @param perpsPath The perps URL path with query parameters
 * @returns Typed navigation parameters
 */
const parsePerpsNavigationParams = (
  perpsPath: string,
): PerpsNavigationParams => {
  const urlParams = new URLSearchParams(
    perpsPath.includes('?') ? perpsPath.split('?')[1] : '',
  );

  return {
    screen:
      (urlParams.get('screen') as PerpsNavigationParams['screen']) || undefined,
    symbol: urlParams.get('symbol') || undefined,
    tab: urlParams.get('tab') || undefined,
  };
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
 * Deadline for the standalone market fetch. The startup deeplink awaits this
 * intent after unlock, so a slow or stalled request must not hold navigation.
 */
const MARKET_FETCH_TIMEOUT_MS = 2_000;

/**
 * Resolve a deeplink symbol to its canonical market symbol. Market symbols are
 * case-sensitive (e.g. 'kPEPE', 'kLUNC'), so match the market list
 * case-insensitively: the preloaded list first, otherwise a standalone fetch
 * that works before Perps is initialized (e.g. cold start). The fetch is
 * skipped when the input already matches the normalized symbol (e.g. 'BTC').
 * Falls back to the normalized symbol (lowercase dex, uppercase asset) when
 * the fetch is skipped, fails, misses its deadline, or nothing matches;
 * PerpsMarketDetailsView matches case-insensitively once its markets load.
 * @param rawSymbol The asset symbol from the deeplink (may include a dex prefix for HIP-3)
 */
const resolvePerpsSymbol = async (rawSymbol: string): Promise<string> => {
  const { marketSource, symbol } = parseHip3Symbol(rawSymbol);
  const normalizedSymbol = marketSource ? `${marketSource}:${symbol}` : symbol;
  const lowerSymbol = rawSymbol.toLowerCase();
  const findSymbol = (marketSymbols: string[]) =>
    marketSymbols.find(
      (marketSymbol) => marketSymbol.toLowerCase() === lowerSymbol,
    );

  try {
    const controller = Engine.context.PerpsController;
    const cachedSymbol = findSymbol(
      controller
        .getCachedMarketDataForActiveProvider({ skipTTL: true })
        ?.map((market) => market.symbol) ?? [],
    );
    if (cachedSymbol || rawSymbol === normalizedSymbol) {
      return cachedSymbol ?? normalizedSymbol;
    }

    const markets = await Promise.race([
      controller.getMarkets({
        standalone: true,
        useTerminalApi: selectPerpsTerminalBackendEnabledFlag(
          ReduxService.store.getState(),
        ),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Market fetch timeout')),
          MARKET_FETCH_TIMEOUT_MS,
        ),
      ),
    ]);
    return findSymbol(markets.map((market) => market.name)) ?? normalizedSymbol;
    // Market discovery is best-effort: on failure, log and keep the legacy
    // normalized symbol so the deeplink still opens the market page.
  } catch (error) {
    DevLogger.log('[handlePerpsUrl] Failed to resolve market symbol:', error);
    return normalizedSymbol;
  }
};

/**
 * Build a minimal market object from a resolved market symbol.
 * Supports both standard crypto symbols (BTC, kPEPE) and HIP-3 format (xyz:TSLA).
 * The PerpsMarketDetailsView fetches the full data; we only need the symbol
 * (and optional marketSource for HIP-3) to route.
 * @param symbol The market symbol (dex:symbol for HIP-3, matching the API format)
 */
const buildPerpsMarket = (symbol: string): PerpsMarketData => {
  const marketSource = getPerpsDexFromSymbol(symbol);

  if (marketSource) {
    DevLogger.log('[handlePerpsUrl] Detected HIP-3 market:', {
      marketSource,
      symbol,
    });
  }

  return {
    symbol,
    name: getPerpsDisplaySymbol(symbol),
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
const perpsHomeTarget = (): DeeplinkIntent['target'] => {
  const { screen, params } = getPerpsHomeNavigationTarget(
    ReduxService.store.getState(),
  );
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
 * - https://link.metamask.io/perps?screen=asset&symbol=kpepe          → PerpsMarketDetailsView (kPEPE, case-insensitive)
 * - https://link.metamask.io/perps?screen=asset&symbol=xyz:TSLA       → PerpsMarketDetailsView (HIP3)
 *
 * Navigation behavior:
 * - First-time users: Always navigate to tutorial (regardless of parameters)
 * - Returning users: Route based on screen parameter
 * - No screen param: Defaults to screen=tabs behavior
 * - screen=tabs: Navigate to wallet home with Perps tab selected
 * - screen=home: Navigate directly to PerpsHomeView
 * - screen=markets: Navigate to PerpsHomeView (backwards compatibility)
 * - screen=market-list: Navigate to PerpsMarketListView with optional tab filter
 * - screen=asset&symbol=X: Navigate directly to asset market details
 *
 * HIP-3 Symbol Format:
 * - Standard crypto: 'BTC', 'ETH'
 * - HIP-3 (dex:symbol): 'xyz:TSLA', 'xyz:xyz100' → marketSource='xyz'
 */
const resolvePerpsTarget = async ({
  perpsPath,
}: HandlePerpsUrlParams): Promise<DeeplinkIntent['target']> => {
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

  // Returning users: route based on screen parameter
  switch (navParams.screen) {
    case 'home':
      // Explicit navigation to PerpsHomeView
      DevLogger.log('[handlePerpsUrl] Navigating to PerpsHomeView');
      return perpsHomeTarget();

    case 'markets':
      // Backwards compatibility: screen=markets → PerpsHomeView
      DevLogger.log(
        '[handlePerpsUrl] Navigating to PerpsHomeView (backwards compat)',
      );
      return perpsHomeTarget();

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
      const rawSymbol = navParams.symbol || '';
      if (!rawSymbol) {
        DevLogger.log(
          '[handlePerpsUrl] No symbol provided, fallback to markets list',
        );
        return perpsHomeTarget();
      }
      return perpsScreenTarget(Routes.PERPS.MARKET_DETAILS, {
        market: buildPerpsMarket(await resolvePerpsSymbol(rawSymbol)),
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
    const urlParams = new URLSearchParams(
      perpsPath.includes('?') ? perpsPath.split('?')[1] : '',
    );
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

export const createPerpsDeeplinkIntent = async ({
  perpsPath,
}: HandlePerpsUrlParams): Promise<DeeplinkIntent> => {
  // Track notification-opened on every entry path:
  //  - Cold/startup path: called directly from handleUniversalLink (locked/killed app)
  //  - Warm path: called via handlePerpsUrl → executeDeeplinkIntent (app already running)
  trackPriceAlertNotificationIfApplicable(perpsPath);
  return {
    target: await resolvePerpsTarget({ perpsPath }),
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

  try {
    // createPerpsDeeplinkIntent calls trackPriceAlertNotificationIfApplicable
    // internally, covering both warm (here) and cold/startup paths consistently.
    await executeDeeplinkIntent(await createPerpsDeeplinkIntent({ perpsPath }));
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
