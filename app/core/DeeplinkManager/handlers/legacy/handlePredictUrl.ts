import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

interface HandlePredictUrlParams {
  predictPath: string;
  origin?: string;
}

/**
 * Interface for parsed predict navigation parameters
 */
interface PredictNavigationParams {
  market?: string; // Market ID
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

  // Support both 'market' and 'marketId' parameter names
  const marketId = urlParams.get('market') || urlParams.get('marketId');

  return {
    market: marketId || undefined,
  };
};

/**
 * Handle market-specific navigation
 * @param marketId The market ID to navigate to
 * @param entryPoint The entry point for analytics tracking
 */
const handleMarketNavigation = (marketId: string, entryPoint: string) => {
  DevLogger.log(
    '[handlePredictUrl] Navigating to market details for market:',
    marketId,
  );

  if (!marketId) {
    DevLogger.log(
      '[handlePredictUrl] No market ID provided, fallback to market list',
    );
    NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { entryPoint },
    });
    return;
  }

  // Navigate to market details with the market ID
  // Note: Market details is under MODALS.ROOT, not the main ROOT
  NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
    screen: Routes.PREDICT.MARKET_DETAILS,
    params: {
      marketId,
      entryPoint,
    },
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
 * - https://link.metamask.io/predict?market=23246
 * - https://link.metamask.io/predict?marketId=23246
 *
 * Origin handling:
 * - Uses origin value directly as entryPoint for analytics tracking
 * - Defaults to 'deeplink' if origin is not provided
 * - Examples: 'carousel', 'notification', 'deeplink', etc.
 *
 * Navigation behavior:
 * - No market param: Navigate to market list
 * - market=X or marketId=X: Navigate directly to market details for market X
 */
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
    // Use origin as entry point, default to 'deeplink' if not provided
    const entryPoint = origin || 'deeplink';
    DevLogger.log('[handlePredictUrl] Entry point:', entryPoint);

    // Parse navigation parameters from URL
    const navParams = parsePredictNavigationParams(predictPath);
    DevLogger.log(
      '[handlePredictUrl] Parsed navigation parameters:',
      navParams,
    );

    // If market ID is provided, navigate to market details
    if (navParams.market) {
      handleMarketNavigation(navParams.market, entryPoint);
    } else {
      // Default to market list
      DevLogger.log('[handlePredictUrl] No market parameter, showing list');
      NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint,
        },
      });
    }
  } catch (error) {
    DevLogger.log('Failed to handle predict deeplink:', error);
    // Fallback to market list on error
    // Default to 'deeplink' entry point for error fallback
    NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: 'deeplink',
      },
    });
  }
};
