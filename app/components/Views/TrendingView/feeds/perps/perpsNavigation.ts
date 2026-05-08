import { NavigationProp } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';

/** Navigate to the perps market list, optionally pre-filtering by market type. */
export const navigateToPerpsMarketList = (
  navigation: NavigationProp<PerpsNavigationParamList>,
  filter: string = 'all',
): void => {
  navigation.navigate(Routes.PERPS.ROOT, {
    screen: Routes.PERPS.MARKET_LIST,
    params: {
      defaultMarketTypeFilter: filter,
      source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
    },
  });
};
