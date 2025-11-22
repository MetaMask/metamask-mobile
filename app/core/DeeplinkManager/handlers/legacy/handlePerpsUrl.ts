import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsMarketData } from '../../../../components/UI/Perps/controllers/types';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../../../../components/UI/Perps/constants/perpsConfig';
import { store } from '../../../../store';
import { selectIsFirstTimePerpsUser } from '../../../../components/UI/Perps/selectors/perpsController';

interface HandlePerpsUrlParams {
  perpsPath: string;
}

/**
 * Extensible interface for parsed perps navigation parameters
 * Supports current screens and can be easily extended for future screens
 */
interface PerpsNavigationParams {
  screen?: 'tabs' | 'markets' | 'asset' | 'tutorial';
  symbol?: string;
  tab?: string; // For future tab selection within wallet home
  // Future extensibility - add new parameters here:
  // portfolio?: boolean;
  // position?: string;
  // timeframe?: string;
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
 * Handle asset-specific navigation with proper error handling
 * @param symbol The asset symbol to navigate to
 */
const handleAssetNavigation = async (symbol: string) => {
  DevLogger.log(
    '[handlePerpsUrl] Navigating to asset details for symbol:',
    symbol,
  );

  if (!symbol) {
    DevLogger.log(
      '[handlePerpsUrl] No symbol provided, fallback to markets list',
    );
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
    return;
  }

  // Create a minimal market object with just the symbol
  // The PerpsMarketDetailsView will fetch the full data
  const market = {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
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
  } as PerpsMarketData;

  NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
    screen: Routes.PERPS.MARKET_DETAILS,
    params: {
      market,
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
  }, PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);
};

/**
 * Unified perps deeplink handler with extensible parameter support
 *
 * @param params Object containing the perps path
 *
 * Supported URL formats:
 * - https://link.metamask.io/perps
 * - https://link.metamask.io/perps?screen=tabs
 * - https://link.metamask.io/perps?screen=markets
 * - https://link.metamask.io/perps?screen=asset&symbol=BTC
 *
 * Navigation behavior:
 * - First-time users: Always navigate to tutorial (regardless of parameters)
 * - Returning users: Route based on screen parameter:
 * - No screen param: Defaults to screen=tabs behavior
 * - screen=tabs: Navigate to wallet home with Perps tab selected
 * - screen=markets: Navigate directly to markets list
 * - screen=asset&symbol=X: Navigate directly to asset market details
 *
 * Future extensibility: Add new screen types and parameters to PerpsNavigationParams interface
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
    const isFirstTime = selectIsFirstTimePerpsUser(store.getState());
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
      case 'markets':
        DevLogger.log('[handlePerpsUrl] Navigating to markets list');
        NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.PERPS_HOME,
        });
        break;

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
    });
  }
};
