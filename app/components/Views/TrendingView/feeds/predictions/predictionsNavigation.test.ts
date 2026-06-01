import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../UI/Predict/constants/worldCupTabs';
import {
  navigateToExplorePredictionsList,
  navigateToExploreWorldCupPredictions,
  navigateToPredictionsList,
} from './predictionsNavigation';

describe('navigateToPredictionsList', () => {
  it('navigates with an explicit entryPoint and trending tab for trending variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(
      navigation,
      'trending',
      PredictEventValues.ENTRY_POINT.EXPLORE,
    );

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        tab: 'trending',
      },
    });
  });

  it('includes tab and explore entryPoint for sports variant', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToPredictionsList(
      navigation,
      'sports',
      PredictEventValues.ENTRY_POINT.EXPLORE,
    );

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

    navigateToPredictionsList(
      navigation,
      'crypto',
      PredictEventValues.ENTRY_POINT.EXPLORE,
    );

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
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        tab: 'trending',
      },
    });
  });

  it('navigates from Explore with explore entryPoint', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToExplorePredictionsList(navigation, 'trending');

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        tab: 'trending',
      },
    });
  });
});

describe('navigateToExploreWorldCupPredictions', () => {
  it('navigates to the dedicated World Cup screen', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as AppNavigationProp;

    navigateToExploreWorldCupPredictions(navigation);

    expect(navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        initialTab: PREDICT_WORLD_CUP_TAB_KEYS.ALL,
      },
    });
  });
});
