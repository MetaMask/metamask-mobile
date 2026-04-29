import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { navigateToPredictionsList } from './predictionsNavigation';

describe('navigateToPredictionsList', () => {
  it('navigates without tab params for trending variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(navigation, 'trending');

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: undefined,
    });
  });

  it('includes tab param for sports variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(navigation, 'sports');

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { tab: 'sports' },
    });
  });

  it('includes tab param for crypto variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(navigation, 'crypto');

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { tab: 'crypto' },
    });
  });
});
