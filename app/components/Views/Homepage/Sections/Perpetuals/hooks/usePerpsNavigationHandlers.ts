import { useCallback, useMemo } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  type PerpsMarketData,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectIsFirstTimePerpsUser } from '../../../../../UI/Perps/selectors/perpsController';
import type { PerpsNavigationParamList } from '../../../../../UI/Perps/types/navigation';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { mergeActiveAbTestAssignmentLists } from '../../../../../../util/analytics/activeABTestAssignments';

interface UsePerpsNavigationHandlersArgs {
  isDedicatedTrendingSection?: boolean;
  trendingTransactionActiveAbTests?: TransactionActiveAbTestEntry[];
  extraTransactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const usePerpsNavigationHandlers = ({
  isDedicatedTrendingSection = false,
  trendingTransactionActiveAbTests,
  extraTransactionActiveAbTests,
}: UsePerpsNavigationHandlersArgs = {}) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  const marketDetailsTransactionActiveAbTests = useMemo(
    () =>
      mergeActiveAbTestAssignmentLists(
        isDedicatedTrendingSection
          ? trendingTransactionActiveAbTests
          : undefined,
        extraTransactionActiveAbTests,
      ),
    [
      extraTransactionActiveAbTests,
      isDedicatedTrendingSection,
      trendingTransactionActiveAbTests,
    ],
  );

  const navigateToTutorialOrScreen = useCallback(
    (screen: string, params: Record<string, unknown>) => {
      if (isFirstTimePerpsUser) {
        navigation.navigate(Routes.PERPS.TUTORIAL, {
          source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
          redirectScreen: screen,
          redirectParams: params,
        });
      } else {
        navigation.navigate(Routes.PERPS.ROOT, { screen, params });
      }
    },
    [isFirstTimePerpsUser, navigation],
  );

  const handleViewAllPerps = useCallback(() => {
    navigateToTutorialOrScreen(Routes.PERPS.PERPS_HOME, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
    });
  }, [navigateToTutorialOrScreen]);

  const handleViewMorePerps = useCallback(() => {
    navigateToTutorialOrScreen(Routes.PERPS.MARKET_LIST, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
    });
  }, [navigateToTutorialOrScreen]);

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
    navigateToTutorialOrScreen,
    handleViewAllPerps,
    handleViewMorePerps,
    handleTilePress,
  };
};
