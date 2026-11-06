import { useCallback } from 'react';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../Predict/constants/eventNames';
import {
  closePredictHeaderSearch,
  openPredictHeaderSearch,
} from '../../Predict/hooks/predictHeaderSearch';
import { PredictNextRoutes } from './routes';

interface PredictStackState {
  key?: string;
  index?: number;
  routeNames?: string[];
  routes?: { name: string; state?: PredictStackState }[];
}

const findPredictStack = (
  state: PredictStackState | undefined,
): PredictStackState | undefined => {
  if (!state?.routeNames) {
    const child = state?.routes?.[state.index ?? 0]?.state;
    return child ? findPredictStack(child) : undefined;
  }
  if (
    state.routeNames.includes(Routes.PREDICT.MARKET_LIST) ||
    state.routeNames.includes(PredictNextRoutes.HOME)
  ) {
    return state;
  }
  return findPredictStack(state.routes?.[state.index ?? 0]?.state);
};

/**
 * Predictions footer destinations.
 * Search uses the header search. Live opens the Live Now feed. Portfolio
 * opens Positions.
 */
export const usePredictSectionActions = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const openHome = useCallback(() => {
    closePredictHeaderSearch();

    const predictRoute = navigation
      .getState()
      .routes.find((item) => item.key === route.key);
    const stack = findPredictStack(
      predictRoute?.state as PredictStackState | undefined,
    );
    const homeName = stack?.routeNames?.includes(Routes.PREDICT.MARKET_LIST)
      ? Routes.PREDICT.MARKET_LIST
      : stack?.routeNames?.includes(PredictNextRoutes.HOME)
        ? PredictNextRoutes.HOME
        : undefined;

    if (stack?.key && homeName) {
      navigation.dispatch({
        ...StackActions.popTo(
          homeName,
          homeName === Routes.PREDICT.MARKET_LIST
            ? {
                entryPoint: PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON,
                openSearch: false,
              }
            : undefined,
          { merge: true },
        ),
        target: stack.key,
      });
      return;
    }

    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON,
        openSearch: false,
      },
      pop: true,
    });
  }, [navigation, route.key]);

  const openSearch = useCallback(() => {
    if (openPredictHeaderSearch()) {
      return;
    }
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.SEARCH,
        openSearch: true,
        searchNonce: Date.now(),
      },
      pop: true,
    });
  }, [navigation]);

  const openLive = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'live',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
      pop: true,
    });
  }, [navigation]);

  const openPortfolio = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.POSITIONS,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      },
      pop: true,
    });
  }, [navigation]);

  return { openHome, openSearch, openLive, openPortfolio };
};
