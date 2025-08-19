import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../../locales/i18n';
import { PerpsPositionDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import type { Position } from '../../controllers/types';

import TradingViewChart from '../../components/TradingViewChart';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import PerpsPositionHeader from '../../components/PerpsPostitionHeader/PerpsPositionHeader';
import { usePerpsPositionData } from '../../hooks/usePerpsPositionData';
import { usePerpsTPSLUpdate, usePerpsClosePosition } from '../../hooks';
import { createStyles } from './PerpsPositionDetailsView.styles';
import PerpsTPSLBottomSheet from '../../components/PerpsTPSLBottomSheet';
import PerpsClosePositionBottomSheet from '../../components/PerpsClosePositionBottomSheet';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import {
  getDefaultCandlePeriodForDuration,
  TimeDuration,
  CandlePeriod,
} from '../../constants/chartConfig';
import PerpsTimeDurationSelector from '../../components/PerpsTimeDurationSelector';

interface PositionDetailsRouteParams {
  position: Position;
  action?: 'close' | 'edit_tpsl';
}

const PerpsPositionDetailsView: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: PositionDetailsRouteParams }, 'params'>>();
  const { top } = useSafeAreaInsets();

  const { position } = route.params || {};

  const [selectedCandlePeriod, setSelectedCandlePeriod] =
    useState<CandlePeriod>(() =>
      getDefaultCandlePeriodForDuration(TimeDuration.ONE_HOUR),
    );
  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const [isClosePositionVisible, setIsClosePositionVisible] = useState(false);
  const [
    isCandlePeriodBottomSheetVisible,
    setIsCandlePeriodBottomSheetVisible,
  ] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<TimeDuration>(
    TimeDuration.ONE_HOUR,
  );

  const { handleUpdateTPSL, isUpdating } = usePerpsTPSLUpdate({
    onSuccess: () => {
      // Navigate back to refresh the position
      navigation.goBack();
    },
  });

  const { handleClosePosition, isClosing } = usePerpsClosePosition({
    onSuccess: () => {
      // Navigate back to positions list after successful close
      navigation.goBack();
    },
  });

  const { candleData, priceData } = usePerpsPositionData({
    coin: position?.coin || '',
    selectedDuration, // Time duration (1hr, 1D, 1W, etc.) - now uses dynamic state
    selectedInterval: selectedCandlePeriod, // Candle period (1m, 3m, 5m, etc.)
  });

  const handleDurationChange = useCallback((newDuration: TimeDuration) => {
    setSelectedDuration(newDuration);
    // Auto-select the appropriate default candle period for this duration
    const defaultPeriod = getDefaultCandlePeriodForDuration(newDuration);
    setSelectedCandlePeriod(defaultPeriod);
  }, []);

  const handleCandlePeriodChange = useCallback((newPeriod: CandlePeriod) => {
    setSelectedCandlePeriod(newPeriod);
  }, []);

  const handleGearPress = useCallback(() => {
    setIsCandlePeriodBottomSheetVisible(true);
  }, []);

  const handleCloseClick = useCallback(() => {
    DevLogger.log('PerpsPositionDetails: Opening close position bottom sheet');
    setIsClosePositionVisible(true);
  }, []);

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Handle initial navigation action
  useEffect(() => {
    if (route.params?.action === 'edit_tpsl') {
      setIsTPSLVisible(true);
    } else if (route.params?.action === 'close') {
      setIsClosePositionVisible(true);
    }
  }, [route.params?.action]);

  const handleEditTPSL = () => {
    DevLogger.log('PerpsPositionDetailsView: handleEditTPSL called');
    setIsTPSLVisible(true);
  };

  if (!position) {
    return (
      <SafeAreaView style={[styles.container, { marginTop: top }]}>
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodySM} color={TextColor.Error}>
            {strings('perps.position.details.error_message')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { marginTop: top }]}>
      <ScrollView>
        {/* Position Header */}
        <PerpsPositionHeader
          position={position}
          onBackPress={handleBackPress}
          priceData={priceData}
        />

        {/* Chart */}
        <View style={styles.section}>
          <TradingViewChart
            candleData={candleData}
            height={350}
            tpslLines={{
              takeProfitPrice: position.takeProfitPrice || undefined,
              stopLossPrice: position.stopLossPrice || undefined,
              entryPrice: position.entryPrice || undefined,
              liquidationPrice: position.liquidationPrice || undefined,
              currentPrice:
                priceData?.price || position.entryPrice || undefined,
            }}
            testID={PerpsPositionDetailsViewSelectorsIDs.TRADINGVIEW_CHART}
          />
          <PerpsTimeDurationSelector
            selectedDuration={selectedDuration}
            onDurationChange={handleDurationChange}
            onGearPress={handleGearPress}
            testID={`${PerpsPositionDetailsViewSelectorsIDs.CANDLESTICK_CHART}-duration-selector`}
          />
        </View>

        {/* Positions Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('perps.position.details.section_title')}
          </Text>
          <PerpsPositionCard
            position={position}
            onClose={handleCloseClick}
            onEdit={handleEditTPSL}
            priceData={priceData}
          />
        </View>
      </ScrollView>

      {/* TP/SL Bottom Sheet */}
      {isTPSLVisible && (
        <PerpsTPSLBottomSheet
          isVisible
          onClose={() => setIsTPSLVisible(false)}
          onConfirm={async (takeProfitPrice, stopLossPrice) => {
            await handleUpdateTPSL(position, takeProfitPrice, stopLossPrice);
            setIsTPSLVisible(false);
          }}
          asset={position.coin}
          position={position}
          currentPrice={
            priceData?.price
              ? parseFloat(priceData.price)
              : parseFloat(position.entryPrice) // Fallback to entry price
          }
          initialTakeProfitPrice={position.takeProfitPrice}
          initialStopLossPrice={position.stopLossPrice}
          isUpdating={isUpdating}
        />
      )}

      {/* Close Position Bottom Sheet */}
      {isClosePositionVisible && (
        <PerpsClosePositionBottomSheet
          isVisible
          onClose={() => setIsClosePositionVisible(false)}
          onConfirm={async (size, orderType, limitPrice) => {
            await handleClosePosition(position, size, orderType, limitPrice);
            setIsClosePositionVisible(false);
          }}
          position={position}
          isClosing={isClosing}
        />
      )}

      {/* Candle Period Bottom Sheet */}
      {isCandlePeriodBottomSheetVisible && (
        <PerpsCandlePeriodBottomSheet
          isVisible
          onClose={() => setIsCandlePeriodBottomSheetVisible(false)}
          selectedPeriod={selectedCandlePeriod}
          selectedDuration={selectedDuration}
          onPeriodChange={handleCandlePeriodChange}
          testID={
            PerpsPositionDetailsViewSelectorsIDs.CANDLE_PERIOD_BOTTOMSHEET
          }
        />
      )}
    </SafeAreaView>
  );
};

export default PerpsPositionDetailsView;
