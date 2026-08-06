import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { openPerpsModeSelection } from './openPerpsModeSelection';

describe('openPerpsModeSelection', () => {
  it('navigates to the mode selection modal with defaults', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as NavigationProp<ParamListBase>;

    openPerpsModeSelection(navigation);

    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.MODE_SELECTION,
      params: {
        entry: 'trade',
        source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      },
    });
  });

  it('forwards entry and source overrides', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as NavigationProp<ParamListBase>;

    openPerpsModeSelection(navigation, {
      entry: 'home',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    });

    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.MODE_SELECTION,
      params: {
        entry: 'home',
        source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      },
    });
  });
});
