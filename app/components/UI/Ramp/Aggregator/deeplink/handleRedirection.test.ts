import { RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';
import handleRedirection from './handleRedirection';
import NavigationService from '../../../../../core/NavigationService';

jest.mock('@react-navigation/native');

describe('handleRedirection', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    mockNavigate = jest.fn();

    // Mock NavigationService.navigation getter
    Object.defineProperty(NavigationService, 'navigation', {
      get: () => ({
        navigate: mockNavigate,
      }),
      configurable: true,
    });
  });

  it('navigates to TRANSACTIONS_VIEW route when first path is "activity"', () => {
    handleRedirection(['activity'], undefined, RampType.BUY);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  });
});
