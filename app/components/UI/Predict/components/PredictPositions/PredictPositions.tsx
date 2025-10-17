import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';

import { FlashList, FlashListRef } from '@shopify/flash-list';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictPosition as PredictPositionType } from '../../types';
import PredictPosition from '../PredictPosition/PredictPosition';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { PredictNavigationParamList } from '../../types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import PredictPositionEmpty from '../PredictPositionEmpty';
import PredictNewButton from '../PredictNewButton';
import { ActivityIndicator, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import PredictPositionResolved from '../PredictPositionResolved/PredictPositionResolved';

export interface PredictPositionsHandle {
  refresh: () => Promise<void>;
}

const PredictPositions = forwardRef<PredictPositionsHandle>((_props, ref) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { positions, isRefreshing, loadPositions, isLoading } =
    usePredictPositions({
      loadOnMount: true,
      refreshOnFocus: true,
    });
  const {
    positions: claimablePositions,
    loadPositions: loadClaimablePositions,
  } = usePredictPositions({
    claimable: true,
    loadOnMount: true,
  });
  const listRef = useRef<FlashListRef<PredictPositionType>>(null);

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
      <View style={tw.style('flex-1 bg-default')}>
        <Box style={tw.style('flex-1 px-4 py-4 justify-center items-center')}>
          <ActivityIndicator
            testID="activity-indicator"
            size="large"
            color={IconColor.Alternative}
          />
        </Box>
      </View>
    );
  }

  // TODO: Sort positions in the controller (business logic)
  return (
    <>
      <FlashList
        testID="active-positions-list"
        ref={listRef}
        data={positions.sort((a, b) => b.percentPnl - a.percentPnl)}
        renderItem={renderPosition}
        scrollEnabled={false}
        keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
        removeClippedSubviews
        decelerationRate={0}
        ListEmptyComponent={<PredictPositionEmpty />}
        ListFooterComponent={positions.length > 0 ? <PredictNewButton /> : null}
      />
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
          <FlashList
            testID="claimable-positions-list"
            data={claimablePositions.sort(
              (a, b) =>
                new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
            )}
            renderItem={renderResolvedPosition}
            scrollEnabled={false}
            keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
          />
        </>
      )}
    </>
  );
});

PredictPositions.displayName = 'PredictPositions';

export default PredictPositions;
