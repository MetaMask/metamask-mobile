import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { ActivityIndicator, View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictPosition as PredictPositionType } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import PredictNewButton from '../PredictNewButton';
import PredictPosition from '../PredictPosition/PredictPosition';
import PredictPositionEmpty from '../PredictPositionEmpty';
import PredictPositionResolved from '../PredictPositionResolved/PredictPositionResolved';
import { PredictPositionsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

export interface PredictPositionsHandle {
  refresh: () => Promise<void>;
}

interface PredictPositionsProps {
  /**
   * Callback when an error occurs during positions fetch
   */
  onError?: (error: string | null) => void;
}

const PredictPositions = forwardRef<
  PredictPositionsHandle,
  PredictPositionsProps
>(({ onError }, ref) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );
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
  const listRef = useRef<FlashListRef<PredictPositionType>>(null);

  const estimatedPositionItemHeight = 92;

  const activePositionsHeight = useMemo(() => {
    if (!isHomepageRedesignV1Enabled) return undefined;
    if (positions.length === 0) return undefined;
    return positions.length * estimatedPositionItemHeight + 92;
  }, [isHomepageRedesignV1Enabled, positions.length]);

  const claimablePositionsHeight = useMemo(() => {
    if (!isHomepageRedesignV1Enabled) return undefined;
    if (claimablePositions.length === 0) return undefined;
    return claimablePositions.length * estimatedPositionItemHeight + 48;
  }, [isHomepageRedesignV1Enabled, claimablePositions.length]);

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

  const renderPosition = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPosition
        position={item}
        onPress={() => {
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: item.marketId,
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
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: item.marketId,
              headerShown: false,
            },
          });
        }}
      />
    ),
    [navigation],
  );

  if (isLoading || (isRefreshing && positions.length === 0)) {
    return (
      <View
        style={tw.style(
          isHomepageRedesignV1Enabled ? 'bg-default' : 'flex-1 bg-default',
        )}
      >
        <Box
          style={tw.style(
            isHomepageRedesignV1Enabled
              ? 'px-4 py-20 justify-center items-center'
              : 'flex-1 px-4 py-4 justify-center items-center',
          )}
        >
          <ActivityIndicator
            testID="activity-indicator"
            size="large"
            color={IconColor.Alternative}
          />
        </Box>
      </View>
    );
  }

  const isTrulyEmpty =
    positions.length === 0 && claimablePositions.length === 0;

  return (
    <>
      {activePositionsHeight ? (
        <View style={{ height: activePositionsHeight }}>
          <FlashList
            testID={PredictPositionsSelectorsIDs.ACTIVE_POSITIONS_LIST}
            ref={listRef}
            data={positions}
            renderItem={renderPosition}
            scrollEnabled={false}
            keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
            removeClippedSubviews
            decelerationRate={0}
            ListEmptyComponent={isTrulyEmpty ? <PredictPositionEmpty /> : null}
            ListFooterComponent={isTrulyEmpty ? null : <PredictNewButton />}
          />
        </View>
      ) : (
        <FlashList
          testID={PredictPositionsSelectorsIDs.ACTIVE_POSITIONS_LIST}
          ref={listRef}
          data={positions}
          renderItem={renderPosition}
          scrollEnabled={false}
          keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
          removeClippedSubviews
          decelerationRate={0}
          ListEmptyComponent={isTrulyEmpty ? <PredictPositionEmpty /> : null}
          ListFooterComponent={isTrulyEmpty ? null : <PredictNewButton />}
        />
      )}
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
          {claimablePositionsHeight ? (
            <View style={{ height: claimablePositionsHeight }}>
              <FlashList
                testID={PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST}
                data={claimablePositions.sort(
                  (a, b) =>
                    new Date(b.endDate).getTime() -
                    new Date(a.endDate).getTime(),
                )}
                renderItem={renderResolvedPosition}
                scrollEnabled={false}
                keyExtractor={(item) =>
                  `${item.outcomeId}:${item.outcomeIndex}`
                }
              />
            </View>
          ) : (
            <FlashList
              testID={PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST}
              data={claimablePositions.sort(
                (a, b) =>
                  new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
              )}
              renderItem={renderResolvedPosition}
              scrollEnabled={false}
              keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
            />
          )}
        </>
      )}
    </>
  );
});

PredictPositions.displayName = 'PredictPositions';

export default PredictPositions;
