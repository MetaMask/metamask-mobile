import { NavigationProp } from '@react-navigation/native';
import {
  PERPS_EVENT_VALUE,
  type MarketTypeFilter,
  type SortDirection,
  type SortOptionId,
} from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';

type PerpsNavigationSource =
  (typeof PERPS_EVENT_VALUE.SOURCE)[keyof typeof PERPS_EVENT_VALUE.SOURCE];

interface NavigateToPerpsMarketListOptions {
  source?: PerpsNavigationSource;
  sortDirection?: SortDirection;
}

/** Navigate to the perps market list, optionally pre-filtering by market type and pre-sorting by a sort option. */
export const navigateToPerpsMarketList = (
  navigation: NavigationProp<PerpsNavigationParamList>,
  filter: MarketTypeFilter = 'all',
  sortOptionId?: SortOptionId,
  {
    source = PERPS_EVENT_VALUE.SOURCE.EXPLORE,
    sortDirection,
  }: NavigateToPerpsMarketListOptions = {},
): void => {
  navigation.navigate(Routes.PERPS.ROOT, {
    screen: Routes.PERPS.MARKET_LIST,
    params: {
      defaultMarketTypeFilter: filter,
      source,
      ...(sortOptionId !== undefined && { defaultSortOptionId: sortOptionId }),
      ...(sortDirection !== undefined && {
        defaultSortDirection: sortDirection,
      }),
    },
  });
};
