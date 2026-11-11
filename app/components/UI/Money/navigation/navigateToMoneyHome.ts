import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';

export interface NavigateToMoneyHomeRouteOptions {
  pop?: boolean;
  analyticsContext?: NavigationAnalyticsContext;
}

export const navigateToMoneyHomeRoute = ({
  pop = true,
  analyticsContext,
}: NavigateToMoneyHomeRouteOptions = {}) =>
  NavigationService.navigation.navigate(
    Routes.HOME_TABS,
    {
      screen: Routes.MONEY.ROOT,
      params: {
        screen: Routes.MONEY.HOME,
        ...(analyticsContext ? { params: { analyticsContext } } : {}),
      },
    },
    { pop },
  );
