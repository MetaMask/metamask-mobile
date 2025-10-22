import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import DevLogger from '../../SDKConnect/utils/DevLogger';

interface HandlePredictUrlParams {
  predictPath: string;
}

const parseMarketIdFromPath = (predictPath: string): string | undefined => {
  if (!predictPath || predictPath === '/') {
    return undefined;
  }

  const segments = predictPath.replace(/^\//, '').split('/');
  return segments[0] || undefined;
};

export const handlePredictUrl = async ({
  predictPath,
}: HandlePredictUrlParams) => {
  DevLogger.log(
    '[handlePredictUrl] Starting predict deeplink handling with path:',
    predictPath,
  );

  try {
    const marketId = parseMarketIdFromPath(predictPath);

    if (marketId) {
      DevLogger.log(
        '[handlePredictUrl] Navigating to market details:',
        marketId,
      );
      NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });

      setTimeout(() => {
        NavigationService.navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: { marketId },
        });
      }, 100);
    } else {
      DevLogger.log('[handlePredictUrl] Navigating to predict feed');
      NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
    }
  } catch (error) {
    DevLogger.log('Failed to handle predict deeplink:', error);
    NavigationService.navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }
};
