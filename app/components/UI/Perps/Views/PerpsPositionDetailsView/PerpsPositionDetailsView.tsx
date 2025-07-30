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
import type { Position } from '../../controllers/types';
import CandlestickChartComponent from '../../components/PerpsCandlestickChart/PerpsCandlectickChart';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import PerpsPositionHeader from '../../components/PerpsPostitionHeader/PerpsPositionHeader';
import { usePerpsPositionData } from '../../hooks/usePerpsPositionData';
import { usePerpsTPSLUpdate } from '../../hooks';
import { createStyles } from './PerpsPositionDetailsView.styles';
import PerpsTPSLBottomSheet from '../../components/PerpsTPSLBottomSheet';

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

  const [selectedInterval, setSelectedInterval] = useState('1h');
  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const { handleUpdateTPSL, isUpdating } = usePerpsTPSLUpdate({
    onSuccess: () => {
      // Navigate back to refresh the position
      navigation.goBack();
    },
  });
  const { candleData, priceData, isLoadingHistory } = usePerpsPositionData({
    coin: position?.coin || '',
    selectedInterval,
  });

  const handleIntervalChange = useCallback((newInterval: string) => {
    setSelectedInterval(newInterval);
  }, []);

  // Handle position close
  const handleClosePosition = useCallback(async () => {
    DevLogger.log('PerpsPositionDetails: handleClosePosition not implemented');
  }, []);

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Handle initial navigation action
  useEffect(() => {
    if (route.params?.action === 'edit_tpsl') {
      setIsTPSLVisible(true);
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
          <CandlestickChartComponent
            candleData={candleData}
            isLoading={isLoadingHistory}
            height={350}
            selectedInterval={selectedInterval}
            onIntervalChange={handleIntervalChange}
          />
        </View>

        {/* Positions Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('perps.position.details.section_title')}
          </Text>
          <PerpsPositionCard
            position={position}
            onClose={handleClosePosition}
            onEdit={handleEditTPSL}
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
    </SafeAreaView>
  );
};

export default PerpsPositionDetailsView;
