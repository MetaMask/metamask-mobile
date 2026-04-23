import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import QuickBuyBottomSheet from './components/QuickBuyBottomSheet';
import TraderPositionHeader from './components/TraderPositionHeader';
import TraderTokenInfoRow from './components/TraderTokenInfoRow';
import TraderPositionChartSection from './components/TraderPositionChartSection';
import TraderTimePeriodSelector from './components/TraderTimePeriodSelector';
import TraderPositionPnLCard from './components/TraderPositionPnLCard';
import TraderTradesSection from './components/TraderTradesSection';
import { useTraderPositionData } from './useTraderPositionData';

const TraderPositionView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderPositionView'>>();
  const tw = useTailwind();

  const {
    traderName,
    traderImageUrl,
    tokenSymbol,
    position: positionParam,
  } = route.params;

  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);

  const {
    symbol,
    marketCap,
    historicalPrices,
    priceDiff,
    isPricesLoading,
    pricePercentChange,
    isClosed,
    positionValue,
    pnlValue,
    pnlPercent,
    isPnlPositive,
    trades,
    activeTimePeriod,
    setActiveTimePeriod,
    timePeriods,
  } = useTraderPositionData(positionParam, tokenSymbol);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBuyPress = useCallback(() => {
    setIsQuickBuyVisible(true);
  }, []);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const handleChartIndexChange = useCallback((_index: number) => {
    // Future: update displayed price on scrub
  }, []);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderPositionViewSelectorsIDs.CONTAINER}
    >
      <TraderPositionHeader
        traderName={traderName}
        onClose={handleClose}
        closeButtonTestID={TraderPositionViewSelectorsIDs.CLOSE_BUTTON}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
      >
        <TraderTokenInfoRow
          symbol={symbol}
          position={positionParam}
          marketCap={marketCap}
          pricePercentChange={pricePercentChange}
          activeTimePeriodLabel={activeTimePeriod}
        />

        <TraderPositionChartSection
          historicalPrices={historicalPrices}
          priceDiff={priceDiff}
          isPricesLoading={isPricesLoading}
          onChartIndexChange={handleChartIndexChange}
        />

        <TraderTimePeriodSelector
          timePeriods={timePeriods}
          activeTimePeriod={activeTimePeriod}
          onSelectPeriod={setActiveTimePeriod}
        />

        <TraderPositionPnLCard
          isClosed={isClosed}
          positionValue={positionValue}
          pnlValue={pnlValue}
          pnlPercent={pnlPercent}
          isPnlPositive={isPnlPositive}
        />

        <TraderTradesSection
          trades={trades}
          traderName={traderName}
          traderImageUrl={traderImageUrl}
        />
      </ScrollView>

      <Box twClassName="px-4 py-3">
        <Button
          variant={ButtonVariant.Secondary}
          isFullWidth
          onPress={handleBuyPress}
          testID={TraderPositionViewSelectorsIDs.BUY_BUTTON}
        >
          {strings('social_leaderboard.trader_position.buy')}
        </Button>
      </Box>

      <QuickBuyBottomSheet
        isVisible={isQuickBuyVisible}
        position={positionParam ?? null}
        onClose={handleQuickBuyClose}
      />
    </SafeAreaView>
  );
};

export default TraderPositionView;
