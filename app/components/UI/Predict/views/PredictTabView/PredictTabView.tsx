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
import {
  PredictPositionStatus,
  PredictPosition as PredictPositionType,
} from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const tw = useTailwind();
  const { positions, isRefreshing, loadPositions, isLoading, error } =
    usePredictPositions({
      loadOnMount: true,
    });
  const {
    positions: claimablePositions,
    loadPositions: loadClaimablePositions,
  } = usePredictPositions({
    loadOnMount: true,
    claimable: true,
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
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  // TODO: remove this once we have a better way to trigger notifications globally
  usePredictNotifications();

  const handleClaimPress = useCallback(() => {
    claim({
      positions: claimablePositions,
    });
  }, [claim, claimablePositions]);

  const renderMarketsWonCard = useCallback(() => {
    if (claimablePositions.length === 0) return null;

    const wonPositions = claimablePositions.filter(
      (position) => position.status === PredictPositionStatus.WON,
    );

    const totalClaimableAmount = wonPositions.reduce(
      (sum: number, position: PredictPositionType) => sum + position.cashPnl,
      0,
    );

    const providerIdForCard = wonPositions[0]?.providerId;

    return (
      <MarketsWonCard
        numberOfMarketsWon={wonPositions.length}
        totalClaimableAmount={totalClaimableAmount}
        onClaimPress={handleClaimPress}
        isLoading={isClaiming}
        address={selectedInternalAccountAddress || undefined}
        providerId={providerIdForCard}
      />
    );
  }, [
    claimablePositions,
    handleClaimPress,
    isClaiming,
    selectedInternalAccountAddress,
  ]);

  const renderItem = useCallback(
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
