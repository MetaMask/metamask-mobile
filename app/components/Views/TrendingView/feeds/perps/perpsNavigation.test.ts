import { NavigationProp } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import { navigateToPerpsMarketList } from './perpsNavigation';

describe('navigateToPerpsMarketList', () => {
  it('navigates to market list with default filter and explore source', () => {
    const navigate = jest.fn();
    const navigation = {
      navigate,
    } as unknown as NavigationProp<PerpsNavigationParamList>;

    navigateToPerpsMarketList(navigation);

    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'all',
        source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
      },
    });
  });

  it('passes a custom market type filter', () => {
    const navigate = jest.fn();
    const navigation = {
      navigate,
    } as unknown as NavigationProp<PerpsNavigationParamList>;

    navigateToPerpsMarketList(navigation, 'commodity');

    expect(navigate).toHaveBeenCalledWith(
      Routes.PERPS.ROOT,
      expect.objectContaining({
        params: expect.objectContaining({
          defaultMarketTypeFilter: 'commodity',
        }),
      }),
    );
  });
});
