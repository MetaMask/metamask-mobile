import { InteractionManager } from 'react-native';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';

interface HandleTrendingUrlParams {
  actionPath: string;
}

const isStocksPath = (actionPath: string): boolean => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return urlParams.get('screen')?.toLowerCase() === 'stocks';
};

export function handleTrendingUrl({ actionPath }: HandleTrendingUrlParams) {
  // Explore -> Stocks Deeplink
  if (isStocksPath(actionPath)) {
    NavigationService.navigation.navigate(Routes.TRENDING_VIEW);
    InteractionManager.runAfterInteractions(() => {
      NavigationService.navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW);
    });
    return;
  }

  // Explore Deeplink
  NavigationService.navigation.navigate(Routes.TRENDING_VIEW);
}
