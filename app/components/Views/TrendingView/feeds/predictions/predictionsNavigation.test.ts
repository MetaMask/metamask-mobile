import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { navigateToPredictionsList } from './predictionsNavigation';

describe('navigateToPredictionsList', () => {
  it('navigates with explore entryPoint and no tab for trending variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(navigation, 'trending');

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE },
    });
  });

  it('includes tab and explore entryPoint for sports variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(navigation, 'sports');

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        tab: 'sports',
      },
    });
  });

  it('includes tab and explore entryPoint for crypto variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(navigation, 'crypto');

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        tab: 'crypto',
      },
    });
  });

  it('passes a custom entryPoint when provided', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(
      navigation,
      'trending',
      PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    );

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED },
    });
  });
});
