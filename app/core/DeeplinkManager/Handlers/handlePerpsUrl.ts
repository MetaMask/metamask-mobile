import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import { PerpsMarketData } from '../../../components/UI/Perps/controllers/types';
import DevLogger from '../../SDKConnect/utils/DevLogger';
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
 * URL format: https://link.metamask.io/perps or https://link.metamask.io/perps-markets
 *
 * Behavior:
 * - First-time users: Navigate to tutorial
 * - Returning users: Navigate to markets list
 */
export const handlePerpsUrl = async ({ perpsPath }: HandlePerpsUrlParams) => {
  DevLogger.log(
    '[handlePerpsUrl] Starting perps deeplink handling with path:',
    perpsPath,
  );
  try {
    // Check if user is first-time perps user using selector
    const isFirstTime = selectIsFirstTimePerpsUser(store.getState());
    DevLogger.log('[handlePerpsUrl] isFirstTimeUser:', isFirstTime);

    if (isFirstTime) {
      DevLogger.log(
        '[handlePerpsUrl] Navigating to tutorial with isFromDeeplink: true',
      );
      // Navigate to tutorial for first-time users
      NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
        params: {
          isFromDeeplink: true,
        },
      });
    } else {
      DevLogger.log(
        '[handlePerpsUrl] Navigating to wallet home with Perps tab selected for returning user',
      );

      // 1. Navigate to wallet home first
      // 2. Mount the Wallet component
      // 3. Select perps tab by default
      NavigationService.navigation.navigate(Routes.WALLET.HOME, {
        params: { initialTab: 'perps', shouldSelectPerpsTab: true },
      });
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
