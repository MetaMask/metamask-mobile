import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { default as React, useCallback, useRef } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import Routes from '../../../../../constants/navigation/Routes';
import MarketsWonCard from '../../components/MarketsWonCard';
import PredictNewButton from '../../components/PredictNewButton';
import PredictPosition from '../../components/PredictPosition';
import PredictPositionEmpty from '../../components/PredictPositionEmpty';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictNotifications } from '../../hooks/usePredictNotifications';
import { PredictPosition as PredictPositionType } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictClaimablePositions } from '../../hooks/usePredictClaimablePositions';
import { usePredictClaim } from '../../hooks/usePredictClaim';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const tw = useTailwind();
  const { positions, isRefreshing, loadPositions, isLoading, error } =
    usePredictPositions({
      loadOnMount: true,
    });
  const { claimablePositions, loadPositions: loadClaimablePositions } =
    usePredictClaimablePositions({
      loadOnMount: true,
    });
  const { claim, loading: isClaiming } = usePredictClaim({
    onComplete: () => {
      loadPositions({ isRefresh: true });
      loadClaimablePositions({ isRefresh: true });
      Alert.alert('Claimed');
    },
    onError: (claimError) => {
      Alert.alert('Error claiming winnings', claimError.message);
    },
  });
  const listRef = useRef<FlashListRef<PredictPositionType>>(null);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  // TODO: remove this once we have a better way to trigger notifications globally
  usePredictNotifications();

  const handleClaimPress = useCallback(() => {
    claim({
      positions: claimablePositions,
    });
  }, [claim, claimablePositions]);

  const renderMarketsWonCard = useCallback(() => {
    if (claimablePositions.length === 0) return null;

    const numberOfMarketsWon = claimablePositions.filter(
      (position) => position.cashPnl > 0,
    );

    const totalClaimableAmount = numberOfMarketsWon.reduce(
      (sum: number, position: PredictPositionType) => sum + position.cashPnl,
      0,
    );

    // TODO: replace with actual data
    const unrealizedAmount = 8.63;
    const unrealizedPercent = 3.9;

    return (
      <MarketsWonCard
        numberOfMarketsWon={numberOfMarketsWon.length}
        totalClaimableAmount={totalClaimableAmount}
        unrealizedAmount={unrealizedAmount}
        unrealizedPercent={unrealizedPercent}
        onClaimPress={handleClaimPress}
        isLoading={isClaiming}
      />
    );
  }, [claimablePositions, handleClaimPress, isClaiming]);

  const renderItem = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPosition
        position={item}
        onPress={() => {
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              position: item,
            },
          });
        }}
      />
    ),
    [navigation],
  );

  const renderLoadingState = () => (
    <Box style={tw.style('flex-1 px-4 py-4')}>
      <Skeleton
        testID="skeleton-loading-1"
        height={40}
        width={'100%'}
        style={tw.style('mb-3 rounded-2xl')}
      />
      <Skeleton
        testID="skeleton-loading-1"
        height={40}
        width={'80%'}
        style={tw.style('mb-3 rounded-2xl')}
      />
      <Skeleton
        testID="skeleton-loading-2"
        height={40}
        width={'60%'}
        style={tw.style('mb-3 rounded-2xl')}
      />
      <Skeleton
        testID="skeleton-loading-3"
        height={40}
        width={'40%'}
        style={tw.style('mb-3 rounded-2xl')}
      />
      <Skeleton
        testID="skeleton-loading-4"
        height={40}
        width={'20%'}
        style={tw.style('mb-3 rounded-2xl')}
      />
    </Box>
  );

  const renderErrorState = () => (
    <View style={tw.style('flex-1 justify-center items-center px-6 py-12')}>
      <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
        {error}
      </Text>
    </View>
  );

  if (isLoading || (isRefreshing && positions.length === 0)) {
    return (
      <View style={tw.style('flex-1 bg-default')}>{renderLoadingState()}</View>
    );
  }

  if (error) {
    return (
      <View style={tw.style('flex-1 bg-default')}>{renderErrorState()}</View>
    );
  }

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <FlashList
        ref={listRef}
        data={positions}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
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
        ListFooterComponent={positions.length > 0 ? <PredictNewButton /> : null}
      />
    </View>
  );
};

export default PredictTabView;
