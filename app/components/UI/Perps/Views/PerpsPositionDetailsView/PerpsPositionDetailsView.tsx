import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
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
import { createStyles } from './PerpsPositionDetailsView.styles';

interface PositionDetailsRouteParams {
  position: Position;
  action?: 'close' | 'edit';
}

const PerpsPositionDetailsView: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: PositionDetailsRouteParams }, 'params'>>();

  const { position } = route.params || {};

  const [selectedInterval, setSelectedInterval] = useState('1h');
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

  // Initialize TP/SL values from current position
  useEffect(() => {
    // TODO: Get current TP/SL from position when available in Position type
    // setTakeProfitPrice(position.takeProfitPrice || '');
    // setStopLossPrice(position.stopLossPrice || '');
  }, [position]);

  const handleEditTPSL = () => {
    DevLogger.log('PerpsPositionDetails: handleEditTPSL not implemented');
  };

  if (!position) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodySM} color={TextColor.Error}>
            {strings('perps.position.details.error_message')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
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
            disabled
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsPositionDetailsView;
