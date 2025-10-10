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
import { Alert, RefreshControl, ScrollView, View , ActivityIndicator } from 'react-native';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import MarketsWonCard from '../../components/MarketsWonCard';
import PredictNewButton from '../../components/PredictNewButton';
import PredictPosition from '../../components/PredictPosition';
import PredictPositionResolved from '../../components/PredictPositionResolved';
import PredictPositionEmpty from '../../components/PredictPositionEmpty';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import {
  PredictPositionStatus,
  PredictPosition as PredictPositionType,
} from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import PredictOnboarding from '../../components/PredictOnboarding/PredictOnboarding';
import { strings } from '../../../../../../locales/i18n';

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

  const handleClaimPress = useCallback(() => {
    claim({
      positions: claimablePositions,
    });
  }, [claim, claimablePositions]);

  const renderMarketsWonCard = useCallback(() => {
    if (claimablePositions.length === 0) return <PredictOnboarding />;

    const wonPositions = claimablePositions.filter(
      (position) => position.status === PredictPositionStatus.WON,
    );

    const totalClaimableAmount = wonPositions.reduce(
      (sum: number, position: PredictPositionType) => sum + position.cashPnl,
      0,
    );

    const providerIdForCard = wonPositions[0]?.providerId;
    const availableBalance = 1000.36;

    return (
      <MarketsWonCard
        availableBalance={availableBalance}
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

  const renderLoadingState = () => (
    <Box style={tw.style('flex-1 px-4 py-4 justify-center items-center')}>
      <ActivityIndicator size="large" color={IconColor.Alternative} />
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
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPositions({ isRefresh: true })}
          />
        }
      >
        {renderMarketsWonCard()}
        <FlashList
          ref={listRef}
          data={positions.sort((a, b) => b.percentPnl - a.percentPnl)}
          renderItem={renderPosition}
          scrollEnabled={false}
          keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
          removeClippedSubviews
          decelerationRate={0}
          ListEmptyComponent={<PredictPositionEmpty />}
          ListFooterComponent={
            positions.length > 0 ? <PredictNewButton /> : null
          }
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
      </ScrollView>
    </View>
  );
};

export default PredictTabView;
