import { RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';
import handleRedirection from './handleRedirection';
import NavigationService from '../../../../../core/NavigationService';

jest.mock('@react-navigation/native');

jest.mock('../../../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

describe('handleRedirection', () => {
  beforeEach(() => {
    (NavigationService.navigation.navigate as jest.Mock).mockClear();
  });

  it('navigates to TRANSACTIONS_VIEW route when first path is "activity"', () => {
    handleRedirection(['activity'], undefined, RampType.BUY);
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.TRANSACTIONS_VIEW,
      {
        screen: Routes.TRANSACTIONS_VIEW,
        params: {
          redirectToOrders: true,
        },
      },
    );
  });
});
