import { useCallback } from 'react';
import {
  useNavigation,
  type NavigationProp,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  type PerpsMarketData,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectIsFirstTimePerpsUser } from '../../../../../UI/Perps/selectors/perpsController';
import type {
  PerpsNavigationParamList,
  PerpsStackParamList,
} from '../../../../../UI/Perps/types/navigation';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

interface UsePerpsNavigationHandlersArgs {
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const usePerpsNavigationHandlers = ({
  transactionActiveAbTests,
}: UsePerpsNavigationHandlersArgs = {}) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  const marketDetailsTransactionActiveAbTests = transactionActiveAbTests?.length
    ? transactionActiveAbTests
    : undefined;

  const navigateToTutorialOrScreen = useCallback(
    <S extends keyof PerpsStackParamList>(
      screen: S,
      params: PerpsStackParamList[S],
    ) => {
      if (isFirstTimePerpsUser) {
        navigation.navigate(Routes.PERPS.TUTORIAL, {
          source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
          redirectScreen: screen,
          redirectParams: params,
        });
      } else {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen,
          params,
        } as NavigatorScreenParams<PerpsStackParamList>);
      }
    },
    [isFirstTimePerpsUser, navigation],
  );

  const handleViewAllPerps = useCallback(() => {
    navigateToTutorialOrScreen(Routes.PERPS.PERPS_HOME, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      ...(marketDetailsTransactionActiveAbTests?.length
        ? {
            transactionActiveAbTests: marketDetailsTransactionActiveAbTests,
          }
        : {}),
    });
  }, [marketDetailsTransactionActiveAbTests, navigateToTutorialOrScreen]);

  const handleViewMorePerps = useCallback(() => {
    navigateToTutorialOrScreen(Routes.PERPS.MARKET_LIST, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      ...(marketDetailsTransactionActiveAbTests?.length
        ? {
            transactionActiveAbTests: marketDetailsTransactionActiveAbTests,
          }
        : {}),
    });
  }, [marketDetailsTransactionActiveAbTests, navigateToTutorialOrScreen]);

  const handleTilePress = useCallback(
    (market: PerpsMarketData) => {
      navigateToTutorialOrScreen(Routes.PERPS.MARKET_DETAILS, {
        market,
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
        ...(marketDetailsTransactionActiveAbTests?.length
          ? {
              transactionActiveAbTests: marketDetailsTransactionActiveAbTests,
            }
          : {}),
      });
    },
    [marketDetailsTransactionActiveAbTests, navigateToTutorialOrScreen],
  );

  return {
    marketDetailsTransactionActiveAbTests,
    navigateToTutorialOrScreen,
    handleViewAllPerps,
    handleViewMorePerps,
    handleTilePress,
  };
};
