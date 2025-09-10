import { RefreshControl, View } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useRef } from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import styleSheet from './PredictTabView.styles';
import { PredictPosition as PredictPositionType } from '../../types';
import PredictPosition from '../../components/PredictPosition';
import MarketsWonCard from '../../components/MarketsWonCard';
import PredictPositionEmpty from '../../components/PredictPositionEmpty';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const { positions, isRefreshing, loadPositions, isLoading, error } =
    usePredictPositions({
      loadOnMount: true,
    });
  const listRef = useRef<FlashListRef<PredictPositionType>>(null);

  const renderMarketsWonCard = useCallback(() => {
    const claimablePositions = positions.filter(
      (position) =>
        position.redeemable &&
        position.cashPnl > 0 &&
        position.realizedPnl === 0,
    );

    if (claimablePositions.length === 0) return null;

    const totalClaimableAmount = claimablePositions.reduce(
      (sum, position) => sum + position.cashPnl,
      0,
    );

    return (
      <MarketsWonCard
        positions={claimablePositions}
        totalClaimableAmount={totalClaimableAmount}
        onClaimPress={() => {
          // TODO: Implement claim winnings functionality
        }}
      />
    );
  }, [positions]);

  const renderItem = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPosition position={item} />
    ),
    [],
  );

  const renderLoadingState = () => (
    <Box style={styles.loadingContainer}>
      <Skeleton
        testID="skeleton-loading-1"
        height={40}
        width={'100%'}
        style={styles.skeleton}
      />
      <Skeleton
        testID="skeleton-loading-1"
        height={40}
        width={'80%'}
        style={styles.skeleton}
      />
      <Skeleton
        testID="skeleton-loading-2"
        height={40}
        width={'60%'}
        style={styles.skeleton}
      />
      <Skeleton
        testID="skeleton-loading-3"
        height={40}
        width={'40%'}
        style={styles.skeleton}
      />
      <Skeleton
        testID="skeleton-loading-4"
        height={40}
        width={'20%'}
        style={styles.skeleton}
      />
    </Box>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
        {error}
      </Text>
    </View>
  );

  if (isLoading || (isRefreshing && positions.length === 0)) {
    return <View style={styles.wrapper}>{renderLoadingState()}</View>;
  }

  if (error) {
    return <View style={styles.wrapper}>{renderErrorState()}</View>;
  }

  return (
    <View style={styles.wrapper}>
      <FlashList
        ref={listRef}
        data={positions}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.conditionId}:${item.outcomeIndex}`}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPositions({ isRefresh: true })}
          />
        }
        removeClippedSubviews
        decelerationRate={0}
        ListHeaderComponent={renderMarketsWonCard}
        ListEmptyComponent={<PredictPositionEmpty />}
        ListFooterComponent={null}
      />
    </View>
  );
};

export default PredictTabView;
