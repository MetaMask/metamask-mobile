import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';

export const openInAppBrowser = (navigation: AppNavigationProp, url: string) =>
  navigation.navigate(Routes.BROWSER.HOME, {
    screen: Routes.BROWSER.VIEW,
    params: { newTabUrl: url, timestamp: Date.now(), fromMoney: true },
  });
