import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import {
  PerpsMarketData,
  MarketTypeFilter,
} from '../../../../components/UI/Perps/controllers/types';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../../../../components/UI/Perps/constants/perpsConfig';
import ReduxService from '../../../redux';
import { selectIsFirstTimePerpsUser } from '../../../../components/UI/Perps/selectors/perpsController';

interface HandlePerpsUrlParams {
  perpsPath: string;
}

/**
 * Maps URL tab parameter to internal MarketTypeFilter values
 * - 'all' → 'all' (shows all markets)
 * - 'crypto' → 'crypto' (crypto-only markets)
 * - 'stocks' → 'stocks_and_commodities' (HIP3 stocks & commodities)
 */
const TAB_TO_FILTER_MAP: Record<string, MarketTypeFilter> = {
  all: 'all',
  crypto: 'crypto',
  stocks: 'stocks_and_commodities',
};

/**
 * Extensible interface for parsed perps navigation parameters
 * Supports current screens and can be easily extended for future screens
 */
interface PerpsNavigationParams {
  screen?: 'tabs' | 'home' | 'markets' | 'market-list' | 'asset' | 'tutorial';
  symbol?: string;
  /** Market category tab filter: 'all' | 'crypto' | 'stocks' */
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
 * Handle asset-specific navigation with proper error handling
 * Supports both standard crypto symbols (BTC, ETH) and HIP-3 format (xyz:TSLA)
 * @param rawSymbol The asset symbol to navigate to (may include dex prefix for HIP-3)
 */
const handleAssetNavigation = async (rawSymbol: string) => {
  DevLogger.log(
    '[handlePerpsUrl] Navigating to asset details for symbol:',
    rawSymbol,
  );

  if (!rawSymbol) {
    DevLogger.log(
      '[handlePerpsUrl] No symbol provided, fallback to markets list',
    );
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'deeplink' },
    });
    return;
  }

  // Parse HIP-3 format (dex:symbol) to extract marketSource
  const { marketSource, symbol } = parseHip3Symbol(rawSymbol);

  if (marketSource) {
    DevLogger.log('[handlePerpsUrl] Detected HIP-3 market:', {
      marketSource,
      symbol,
    });
  }

  // Create a minimal market object with the symbol and optional marketSource
  // The PerpsMarketDetailsView will fetch the full data
  // Use combined format (dex:symbol) for HIP-3 to match API format
  const market = {
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

  NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
    screen: Routes.PERPS.MARKET_DETAILS,
    params: {
      market,
      source: 'deeplink',
    },
  });
};

/**
 * Handle navigation to wallet home with perps tab selected
 * @param tab Optional specific tab to select (future extensibility)
 */
const handleTabsNavigation = (tab?: string) => {
  DevLogger.log(
    '[handlePerpsUrl] Navigating to wallet home with perps tab selected',
  );
  NavigationService.navigation.navigate(Routes.WALLET.HOME);

  // The timeout is REQUIRED - React Navigation needs time to:
  // 1. Complete the navigation transition
  // 2. Mount the Wallet component
  // 3. Make navigation context available for setParams
  // Without this delay, the tab selection will fail
  setTimeout(() => {
    NavigationService.navigation.setParams({
      initialTab: 'perps',
      shouldSelectPerpsTab: true,
      // Future: could use tab parameter for more specific navigation
      ...(tab && { specificTab: tab }),
    });
  }, PERFORMANCE_CONFIG.NavigationParamsDelayMs);
};

/**
 * Unified perps deeplink handler with extensible parameter support
 *
 * @param params Object containing the perps path
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
export const handlePerpsUrl = async ({ perpsPath }: HandlePerpsUrlParams) => {
  DevLogger.log(
    '[handlePerpsUrl] Starting perps deeplink handling with path:',
    perpsPath,
  );

  try {
    // Parse navigation parameters from URL
    const navParams = parsePerpsNavigationParams(perpsPath);
    DevLogger.log('[handlePerpsUrl] Parsed navigation parameters:', navParams);

    // Check if user is first-time perps user - always goes to tutorial first
    const isFirstTime = selectIsFirstTimePerpsUser(
      ReduxService.store.getState(),
    );
    DevLogger.log('[handlePerpsUrl] isFirstTimeUser:', isFirstTime);

    if (isFirstTime) {
      DevLogger.log(
        '[handlePerpsUrl] First-time user, navigating to tutorial regardless of URL parameters',
      );
      NavigationService.navigation.navigate(Routes.PERPS.TUTORIAL, {
        isFromDeeplink: true,
      });
      return;
    }

    // Returning users: route based on screen parameter
    switch (navParams.screen) {
      case 'home':
        // Explicit navigation to PerpsHomeView
        DevLogger.log('[handlePerpsUrl] Navigating to PerpsHomeView');
        NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.PERPS_HOME,
          params: { source: 'deeplink' },
        });
        break;

      case 'markets':
        // Backwards compatibility: screen=markets → PerpsHomeView
        DevLogger.log(
          '[handlePerpsUrl] Navigating to PerpsHomeView (backwards compat)',
        );
        NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.PERPS_HOME,
          params: { source: 'deeplink' },
        });
        break;

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
        NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_LIST,
          params: {
            source: 'deeplink',
            ...(marketTypeFilter && {
              defaultMarketTypeFilter: marketTypeFilter,
            }),
          },
        });
        break;
      }

      case 'asset':
        DevLogger.log('[handlePerpsUrl] Navigating to asset details');
        await handleAssetNavigation(navParams.symbol || '');
        break;

      case 'tabs':
        handleTabsNavigation(navParams.tab);
        break;

      default:
        // No screen parameter: default to tabs behavior for consistency
        DevLogger.log(
          '[handlePerpsUrl] No screen parameter, defaulting to tabs navigation',
        );
        handleTabsNavigation(navParams.tab);
        break;
    }
  } catch (error) {
    DevLogger.log('Failed to handle perps deeplink:', error);
    // Fallback to markets list on error
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'deeplink' },
    });
  }
};
