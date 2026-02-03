import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';

import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictPrices } from '../../hooks/usePredictPrices';
import {
  PredictPosition as PredictPositionType,
  PriceQuery,
} from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import PredictNewButton from '../PredictNewButton';
import PredictPosition from '../PredictPosition/PredictPosition';
import PredictPositionEmpty from '../PredictPositionEmpty';
import PredictPositionResolved from '../PredictPositionResolved/PredictPositionResolved';
import PredictPositionSkeleton from '../PredictPositionSkeleton';
import { PredictPositionsSelectorsIDs } from '../../Predict.testIds';

export interface PredictPositionsHandle {
  refresh: () => Promise<void>;
}

interface PredictPositionsProps {
  isVisible?: boolean;
  /**
   * Callback when an error occurs during positions fetch
   */
  onError?: (error: string | null) => void;
}

const PredictPositions = forwardRef<
  PredictPositionsHandle,
  PredictPositionsProps
>(({ isVisible, onError }, ref) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { positions, isRefreshing, loadPositions, isLoading, error } =
    usePredictPositions({
      loadOnMount: true,
      refreshOnFocus: true,
    });
  const {
    positions: claimablePositions,
    loadPositions: loadClaimablePositions,
    error: claimableError,
  } = usePredictPositions({
    claimable: true,
    loadOnMount: true,
    refreshOnFocus: true,
  });

  // Build price queries for fetching real-time CLOB prices
  const priceQueries: PriceQuery[] = useMemo(
    () =>
      positions.map((position) => ({
        marketId: position.marketId,
        outcomeId: position.outcomeId,
        outcomeTokenId: position.outcomeTokenId,
      })),
    [positions],
  );

  // Fetch real-time prices with 5-second polling
  const { prices } = usePredictPrices({
    queries: priceQueries,
    providerId: 'polymarket',
    enabled: !isLoading && priceQueries.length > 0,
    pollingInterval: 5000,
  });

  // Create positions with updated currentValue from real-time prices
  const positionsWithPrices = useMemo(() => {
    if (!prices.results.length) {
      return positions;
    }

    return positions.map((position) => {
      const priceResult = prices.results.find(
        (r) => r.outcomeTokenId === position.outcomeTokenId,
      );
      if (!priceResult) {
        return position;
      }

      const realTimePrice = priceResult.entry.buy;
      const updatedCurrentValue = realTimePrice * position.size;
      const updatedPercentPnl =
        position.initialValue > 0
          ? ((updatedCurrentValue - position.initialValue) /
              position.initialValue) *
            100
          : 0;

      return {
        ...position,
        currentValue: updatedCurrentValue,
        percentPnl: updatedPercentPnl,
      };
    });
  }, [positions, prices.results]);

  // Notify parent of errors while keeping state isolated
  useEffect(() => {
    const combinedError = error || claimableError;
    onError?.(combinedError);
  }, [error, claimableError, onError]);

  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await Promise.all([
        loadPositions({ isRefresh: true }),
        loadClaimablePositions({ isRefresh: true }),
      ]);
    },
  }));

  // Track position viewed when tab becomes visible
  useEffect(() => {
    if (isVisible && !isLoading) {
      Engine.context.PredictController.trackPositionViewed({
        openPositionsCount: positions.length,
      });
    }
  }, [isVisible, isLoading, positions.length]);

  const renderPosition = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPosition
        position={item}
        skipOptimisticRefresh
        onPress={() => {
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: item.marketId,
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
              headerShown: false,
            },
          });
        }}
      />
    ),
    [navigation],
  );

  const renderResolvedPosition = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPositionResolved
        position={item}
        onPress={() => {
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: item.marketId,
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
              headerShown: false,
            },
          });
        }}
      />
    ),
    [navigation],
  );

  const isTrulyEmpty =
    positions.length === 0 && claimablePositions.length === 0;

  // TODO: Sort positions in the controller (business logic)
  return (
    <>
      <View testID={PredictPositionsSelectorsIDs.ACTIVE_POSITIONS_LIST}>
        {isLoading || (isRefreshing && positions.length === 0) ? (
          // Show skeleton loaders during initial load
          <>
            {[1, 2, 3, 4].map((index) => (
              <PredictPositionSkeleton
                key={`skeleton-${index}`}
                testID={`predict-position-skeleton-${index}`}
              />
            ))}
          </>
        ) : isTrulyEmpty ? (
          <PredictPositionEmpty />
        ) : (
          <>
            {positionsWithPrices.map((item) => (
              <React.Fragment key={`${item.outcomeId}:${item.outcomeIndex}`}>
                {renderPosition({ item })}
              </React.Fragment>
            ))}
          </>
        )}
      </View>
      {!isTrulyEmpty && !isLoading && <PredictNewButton />}
      {claimablePositions.length > 0 && (
        <>
          <Box>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative mb-4"
            >
              {strings('predict.tab.resolved_markets')}
            </Text>
          </Box>
          <View testID={PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST}>
            {claimablePositions
              .sort(
                (a, b) =>
                  new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
              )
              .map((item) => (
                <React.Fragment key={`${item.outcomeId}:${item.outcomeIndex}`}>
                  {renderResolvedPosition({ item })}
                </React.Fragment>
              ))}
          </View>
        </>
      )}
    </>
  );
});

PredictPositions.displayName = 'PredictPositions';

export default PredictPositions;
