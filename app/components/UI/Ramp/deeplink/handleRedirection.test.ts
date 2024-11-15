import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RampType } from '../types';
import Routes from '../../../../constants/navigation/Routes';
import handleRedirection from './handleRedirection';

jest.mock('@react-navigation/native');

describe('handleRedirection', () => {
  let navigation: NavigationProp<ParamListBase>;

  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;
  });

  it('navigates to TRANSACTIONS_VIEW route when first path is "activity"', () => {
    handleRedirection(['activity'], undefined, RampType.BUY, navigation);
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  });
});
