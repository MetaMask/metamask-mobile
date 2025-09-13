import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import { PerpsMarketData } from '../../../components/UI/Perps/controllers/types';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../../../components/UI/Perps/constants/perpsConfig';
import { store } from '../../../store';
import { selectIsFirstTimePerpsUser } from '../../../components/UI/Perps/selectors/perpsController';

interface HandlePerpsUrlParams {
  perpsPath: string;
}

interface HandlePerpsAssetUrlParams {
  assetPath: string;
}

/**
 * Handles deeplinks for the perps market details
 * Priority #1: Main perps deeplink
 *
 * @param params Object containing the perps path
 *
 * URL format: https://link.metamask.io/perps or https://link.metamask.io/perps?screen=markets
 *
 * Behavior:
 * - First-time users: Always go to tutorial (regardless of parameters)
 * - Returning users: Route based on parameters:
 * - perps (no params): Navigate to wallet home with Perps tab selected
 * - perps?screen=markets: Navigate directly to markets list (PerpsMarketListView)
 */
export const handlePerpsUrl = async ({ perpsPath }: HandlePerpsUrlParams) => {
  DevLogger.log(
    '[handlePerpsUrl] Starting perps deeplink handling with path:',
    perpsPath,
  );
  try {
    // Check if user is first-time perps user - always goes to tutorial first
    const isFirstTime = selectIsFirstTimePerpsUser(store.getState());
    DevLogger.log('[handlePerpsUrl] isFirstTimeUser:', isFirstTime);

    if (isFirstTime) {
      DevLogger.log(
        '[handlePerpsUrl] First-time user, navigating to tutorial regardless of URL',
      );
      // First-time users always go to tutorial, regardless of URL
      NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
      return;
    }

    // Returning users: route based on URL parameters
    // Parse URL parameters to check for screen parameter
    const urlParams = new URLSearchParams(
      perpsPath.includes('?') ? perpsPath.split('?')[1] : '',
    );
    const screenParam = urlParams.get('screen');

    if (screenParam === 'markets') {
      DevLogger.log(
        '[handlePerpsUrl] Returning user requesting markets, navigating directly to markets list',
      );
      // Direct to markets list for screen=markets parameter
      NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    } else {
      DevLogger.log(
        '[handlePerpsUrl] Returning user requesting perps, navigating to wallet home with Perps tab',
      );
      // Regular perps URL: go to wallet tab for returning users
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
        });
      }, PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);
    }
  } catch (error) {
    DevLogger.log('Failed to handle perps deeplink:', error);
    // Fallback to markets list on error
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKETS,
    });
  }
};

/**
 * Handles deeplinks for specific perps assets
 * Priority #2: Asset-specific deeplink
 *
 * @param params Object containing the asset path
 *
 * URL format: https://link.metamask.io/perps-asset?symbol=BTC
 *
 * Parameters:
 * - symbol: The asset symbol (e.g., 'BTC', 'ETH')
 *
 * Behavior:
 * - Navigate directly to the specific asset's market details
 * - Falls back to markets list if asset not found
 */
export const handlePerpsAssetUrl = async ({
  assetPath,
}: HandlePerpsAssetUrlParams) => {
  DevLogger.log('[handlePerpsAssetUrl] Starting with assetPath:', assetPath);
  try {
    // Parse URL parameters
    const cleanPath = assetPath.startsWith('?')
      ? assetPath.slice(1)
      : assetPath;
    const urlParams = new URLSearchParams(cleanPath);
    const symbol = urlParams.get('symbol');

    DevLogger.log('[handlePerpsAssetUrl] Parsed symbol:', symbol);

    if (!symbol) {
      // No symbol provided, navigate to markets list
      DevLogger.log(
        '[handlePerpsAssetUrl] No symbol provided, navigating to markets list',
      );
      NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
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

    DevLogger.log(
      '[handlePerpsAssetUrl] Navigating directly to market details for:',
      symbol,
    );
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market,
      },
    });
  } catch (error) {
    DevLogger.log('Failed to handle perps asset deeplink:', error);
    // Fallback to markets list on error
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKETS,
    });
  }
};
