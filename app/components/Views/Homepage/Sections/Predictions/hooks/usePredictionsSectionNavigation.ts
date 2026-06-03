import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectPredictEnabledFlag } from '../../../../../UI/Predict/selectors/featureFlags';
import type { PredictNavigationParamList } from '../../../../../UI/Predict/types/navigation';
import { PredictEventValues } from '../../../../../UI/Predict/constants/eventNames';
import type { PredictPosition } from '../../../../../UI/Predict/types';
import { predictQueries } from '../../../../../UI/Predict/queries';
import { getEvmAccountFromSelectedAccountGroup } from '../../../../../UI/Predict/utils/accounts';
import {
  HomeSectionNames,
  type HomeSectionName,
} from '../../../hooks/useHomeViewedEvent';
import { strings } from '../../../../../../../locales/i18n';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export const usePredictNavigationHandlers = (): {
  handleViewAllPredictions: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  handleViewAllFromPositions: () => void;
  handlePositionPress: (position: PredictPosition) => void;
} => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const handleViewAllPredictions = useCallback(
    (transactionActiveAbTests?: TransactionActiveAbTestEntry[]) => {
      const activeAbTests = Array.isArray(transactionActiveAbTests)
        ? transactionActiveAbTests
        : undefined;

      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          ...(activeAbTests?.length && {
            transactionActiveAbTests: activeAbTests,
          }),
        },
      });
    },
    [navigation],
  );

  const handleViewAllFromPositions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      },
    });
  }, [navigation]);

  const handlePositionPress = useCallback(
    (position: PredictPosition) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: position.marketId,
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
          headerShown: false,
        },
      });
    },
    [navigation],
  );

  return {
    handleViewAllPredictions,
    handleViewAllFromPositions,
    handlePositionPress,
  };
};

export const usePredictionsCommonSetup = ({
  sectionNameOverride,
  titleOverride,
}: {
  sectionNameOverride?: HomeSectionName;
  titleOverride?: string;
}) => {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const queryClient = useQueryClient();
  const title = titleOverride ?? strings('homepage.sections.predictions');
  const analyticsName = sectionNameOverride ?? HomeSectionNames.PREDICT;
  const {
    handleViewAllPredictions,
    handleViewAllFromPositions,
    handlePositionPress,
  } = usePredictNavigationHandlers();

  return {
    isPredictEnabled,
    queryClient,
    title,
    analyticsName,
    handleViewAllPredictions,
    handleViewAllFromPositions,
    handlePositionPress,
  };
};

export const useRefreshPredictPositions = ({
  queryClient,
  refetchPositions,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  refetchPositions: () => Promise<unknown>;
}) =>
  useCallback(async () => {
    const addr = getEvmAccountFromSelectedAccountGroup()?.address;
    const invalidatePnl = addr
      ? queryClient.invalidateQueries({
          queryKey: predictQueries.unrealizedPnL.keys.byAddress(addr),
        })
      : Promise.resolve();
    await Promise.all([refetchPositions(), invalidatePnl]);
  }, [queryClient, refetchPositions]);
