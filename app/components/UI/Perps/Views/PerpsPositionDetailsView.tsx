import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text from '../../../../component-library/components/Texts/Text';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import type { Position } from '../controllers/types';
import { formatPercentage, formatPrice } from '../utils/formatUtils';
import { calculatePnLPercentageFromUnrealized } from '../utils/pnlCalculations';
import CandlestickChartComponent from '../components/PerpsCandlestickChart/PerpsCandlectickChart';
import { HyperLiquidSubscriptionService } from '../services/HyperLiquidSubscriptionService';
import PerpsPositionCard from '../components/PerpsPositionCard';
import PerpsPositionHeader from '../components/PerpsPostitionHeader/PerpsPositionHeader';

interface PositionDetailsRouteParams {
  position: Position;
  action?: 'close' | 'edit';
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.default,
    },
    positionHeader: {
      backgroundColor: colors.background.alternative,
      margin: 16,
      borderRadius: 12,
      padding: 16,
    },
    assetInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    assetName: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text.default,
      marginRight: 12,
    },
    directionBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    longBadge: {
      backgroundColor: colors.success.muted,
    },
    section: {
      marginBottom: 8,
    },
    shortBadge: {
      backgroundColor: colors.error.muted,
    },
    directionText: {
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    longText: {
      color: colors.success.default,
    },
    shortText: {
      color: colors.error.default,
    },
    pnlContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    pnlValue: {
      fontSize: 28,
      fontWeight: '700',
    },
    positivePnl: {
      color: colors.success.default,
    },
    negativePnl: {
      color: colors.error.default,
    },
    pnlPercentage: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 4,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: 16,
    },
    detailCard: {
      width: '48%',
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      marginHorizontal: '1%',
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 6,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    actionsSection: {
      margin: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginTop: 8,
      marginBottom: 8,
      marginLeft: 16,
    },
    closeSection: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    closeWarning: {
      backgroundColor: colors.warning.muted,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    warningText: {
      fontSize: 14,
      color: colors.warning.default,
      textAlign: 'center',
      lineHeight: 20,
    },
    buttonContainer: {
      marginTop: 8,
    },
    editButton: {
      marginBottom: 12,
    },
    closeButton: {
      backgroundColor: colors.error.default,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
    },
    loadingText: {
      fontSize: 16,
      color: colors.text.muted,
      marginTop: 16,
    },
    errorContainer: {
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      padding: 16,
      margin: 16,
    },
    errorText: {
      fontSize: 14,
      color: colors.error.default,
      textAlign: 'center',
    },
    headerPlaceholder: {
      width: 32,
    },
    // TP/SL Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay.default,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 20,
      margin: 20,
      maxWidth: 350,
      width: '90%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      textAlign: 'center',
      marginBottom: 20,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.default,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text.default,
      backgroundColor: colors.background.alternative,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
    },
  });

const PerpsPositionDetailsView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: PositionDetailsRouteParams }, 'params'>>();

  const { position } = route.params || {};
  const [error, setError] = useState<string | null>(null);

  // Calculate position metrics
  const isLong = parseFloat(position.size) > 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));
  const pnlNum = parseFloat(position.unrealizedPnl);
  const pnlPercentage = calculatePnLPercentageFromUnrealized({
    unrealizedPnl: pnlNum,
    entryPrice: parseFloat(position.entryPrice),
    size: parseFloat(position.size),
  });

  const [candleData, setCandleData] = useState<{
    coin: string;
    interval: string;
    candles: {
      time: number;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    }[];
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('1h');

  const fetchHistoricalCandles = useCallback(async () => {
    const historicalData =
      await HyperLiquidSubscriptionService.fetchHistoricalCandles(
        position.coin,
        selectedInterval,
        100,
      );
    return historicalData;
  }, [position.coin, selectedInterval]);

  const handleIntervalChange = useCallback((newInterval: string) => {
    setSelectedInterval(newInterval);
  }, []);

  useEffect(() => {
    setIsLoadingHistory(true);
    const loadHistoricalData = async () => {
      try {
        const historicalData = await fetchHistoricalCandles();
        setCandleData(historicalData);
      } catch (err) {
        console.error('Error loading historical candles:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoricalData();
  }, [fetchHistoricalCandles]);

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
    setError(null);
  };

  // Position details data
  const positionDetails = useMemo(
    () => [
      { label: 'Size', value: `${absoluteSize.toFixed(6)} ${position.coin}` },
      { label: 'Entry Price', value: formatPrice(position.entryPrice) },
      {
        label: 'Mark Price',
        value: formatPrice(position.liquidationPrice || position.entryPrice),
      },
      { label: 'Position Value', value: formatPrice(position.positionValue) },
      { label: 'Margin Used', value: formatPrice(position.marginUsed) },
      { label: 'Leverage', value: `${position.leverage.value}x` },
      {
        label: 'Liquidation Price',
        value: position.liquidationPrice
          ? formatPrice(position.liquidationPrice)
          : 'N/A',
      },
      {
        label: 'ROE',
        value: formatPercentage(parseFloat(position.returnOnEquity || '0')),
      },
      // TODO: Add actual TP/SL fields when available in Position type
      { label: 'Take Profit', value: 'Not Set' },
      { label: 'Stop Loss', value: 'Not Set' },
    ],
    [position, absoluteSize],
  );

  if (!position) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Position data not found. Please go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Md}
          onPress={handleBackPress}
        />
        <Text style={styles.headerTitle}>Position Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.container}>
        {/* Position Header */}
        <PerpsPositionHeader
          position={position}
          pnlPercentage={pnlPercentage}
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
          <Text style={styles.sectionTitle}>Position</Text>
          <PerpsPositionCard
            position={position}
            onClose={handleClosePosition}
            onEdit={handleEditTPSL}
            disabled
          />
        </View>

        {/* Position Details Grid */}
        <View style={styles.detailsGrid}>
          {positionDetails.map((detail, index) => (
            <View key={index} style={styles.detailCard}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Position Actions</Text>

          <View style={styles.closeSection}>
            <View style={styles.closeWarning}>
              <Text style={styles.warningText}>
                ⚠️ Closing this position will execute a market order to exit
                your entire {direction.toUpperCase()} position in{' '}
                {position.coin}.
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label="Edit TP/SL"
                onPress={handleEditTPSL}
                loading={false} // TODO: Add loading state when implemented
                style={styles.editButton}
              />

              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={`Close ${direction.toUpperCase()} Position`}
                onPress={handleClosePosition}
                loading={false} // TODO: Add loading state when implemented
                style={styles.closeButton}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsPositionDetailsView;
