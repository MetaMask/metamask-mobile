import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';

export const openInAppBrowser = (navigation: AppNavigationProp, url: string) =>
  navigation.navigate(Routes.BROWSER.HOME, {
    newTabUrl: url,
    timestamp: Date.now(),
    fromMoney: true,
  });
