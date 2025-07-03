import React, { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import ScreenView from '../../Base/ScreenView';
import { Theme } from '../../../util/theme/models';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';
import PerpsPositionListItem from './PerpsPositionListItem';
import HyperliquidWebSocketService from './WebSocketService';

interface PositionData {
  id: string;
  assetSymbol: string;
  tokenPair: string;
  leverage: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  positionSize: number;
  entryPrice: number;
  liquidationPrice: number;
  funding: number;
  margin: number;
  takeProfitStopLoss: number;
}

interface PerpsDetailPageProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    headerContainer: {
      alignItems: 'center' as const,
      marginBottom: 32,
    },
    assetHeader: {
      alignItems: 'flex-start' as const,
      marginBottom: 32,
    },
    assetPill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.background.alternative,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 16,
      alignSelf: 'flex-start' as const,
    },
    assetIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.background.default,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 8,
    },
    assetText: {
      fontSize: 8,
      fontWeight: '700' as const,
      color: colors.text.default,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text.default,
    },
    entryPrice: {
      fontSize: 32,
      fontWeight: '700' as const,
      marginBottom: 8,
      color: colors.text.default,
    },
    priceChangeContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    priceChange: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginRight: 8,
    },
    timeInterval: {
      fontSize: 14,
      color: colors.text.muted,
    },
    priceChangePositive: {
      color: colors.success.default,
    },
    priceChangeNegative: {
      color: colors.error.default,
    },
    detailsSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    chartSection: {
      marginBottom: 32,
      height: 250,
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    chartPlaceholder: {
      textAlign: 'center' as const,
    },
    chartSubtext: {
      textAlign: 'center' as const,
      marginTop: 8,
    },
    candleDataSection: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    candleTitle: {
      marginBottom: 8,
      textAlign: 'left' as const,
      fontWeight: '600' as const,
    },
    candleData: {
      marginBottom: 4,
      textAlign: 'left' as const,
    },
    actionButtonsSection: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 32,
      gap: 6,
    },
    statsSection: {
      marginBottom: 32,
    },
    statsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
    },
    statItem: {
      width: '48%' as const,
      marginBottom: 16,
      paddingVertical: 8,
    },
    statLabel: {
      marginBottom: 4,
    },
    statValue: {
      fontWeight: '600' as const,
      fontSize: 14,
    },
    buttonContainer: {
      marginTop: 'auto' as const,
    },
    button: {
      marginBottom: 16,
    },
    actionButton: {
      flex: 1,
    },
  };
};

const PerpsDetailPage: React.FC<PerpsDetailPageProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const route = useRoute();

  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const candleSubscribedRef = useRef(false);
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

  // Get the position data from route params
  const position = (route.params as { position: PositionData })?.position;

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new HyperliquidWebSocketService();

    // First, fetch historical data
    const fetchHistoricalData = async () => {
      if (!position) return;

      setIsLoadingHistory(true);
      Logger.log(
        'PerpsDetailPage: Fetching historical candle data for',
        position.assetSymbol,
      );

      try {
        const historicalData = await ws.fetchHistoricalCandles(
          position.assetSymbol,
          '1h',
          100,
        );
        if (historicalData) {
          setCandleData(historicalData);
          Logger.log(
            'PerpsDetailPage: Historical data loaded:',
            historicalData.candles.length,
            'candles',
          );
        }
      } catch (error) {
        Logger.log('PerpsDetailPage: Error fetching historical data:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    // Fetch historical data first
    fetchHistoricalData();

    // Check connection status periodically and subscribe when connected
    let connectionStableTime = 0;
    const statusInterval = setInterval(() => {
      const connected = ws.getConnectionStatus();
      setIsConnected(connected);

      // Track how long the connection has been stable
      if (connected) {
        connectionStableTime += 1000;
      } else {
        connectionStableTime = 0;
      }

      // Subscribe to candle data once connected and stable for 2 seconds
      if (
        connected &&
        position &&
        !candleSubscribedRef.current &&
        connectionStableTime >= 2000
      ) {
        Logger.log(
          'HyperliquidWebSocket: Connection stable, subscribing directly to candle data for',
          position.assetSymbol,
        );

        // Subscribe directly to candle data - no test needed
        ws.subscribeToCandleData(
          position.assetSymbol,
          '1h',
          (updatedCandleData) => {
            Logger.log(
              'HyperliquidWebSocket: Received candle update:',
              updatedCandleData,
            );
            // Update the full candle data
            setCandleData(updatedCandleData);
          },
        );

        candleSubscribedRef.current = true;
      }
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      ws.disconnect();
    };
  }, [position]);

  if (!position) {
    Logger.log('PerpsDetailPage: No position data provided');
    return (
      <ScreenView>
        <View style={styles.content}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Error: No position data
          </Text>
        </View>
      </ScreenView>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const isPositiveChange = position.priceChangePercent24h >= 0;

  // Mock stats data - in real app this would come from API
  const statsData = [
    { label: '24h High', value: formatCurrency(position.currentPrice * 1.05) },
    { label: '24h Low', value: formatCurrency(position.currentPrice * 0.95) },
    { label: 'Mark', value: formatCurrency(position.currentPrice) },
    { label: 'Oracle', value: formatCurrency(position.currentPrice * 1.001) },
    { label: '24h Volume', value: '$2.4B' },
    { label: 'Open Interest', value: '$847M' },
    { label: 'Funding Rate', value: '0.0125%' },
    { label: 'Countdown', value: '7h 23m' },
  ];

  const handleBackToPositions = () => {
    navigation.navigate(Routes.PERPS.POSITIONS_VIEW as never);
  };

  const handleClosePosition = () => {
    Logger.log('PerpsDetailPage: Close position for', position.assetSymbol);
    // TODO: Implement close position logic
  };

  const handleEditPosition = () => {
    Logger.log('PerpsDetailPage: Edit position for', position.assetSymbol);
    // TODO: Implement edit position logic
  };

  return (
    <ScreenView>
      <View style={styles.content}>
        {/* Asset Header */}
        <View style={styles.assetHeader}>
          {/* Asset Pill */}
          <View style={styles.assetPill}>
            <View style={styles.assetIcon}>
              <Text style={styles.assetText}>{position.assetSymbol}</Text>
            </View>
            <Text style={styles.pillText}>
              {position.tokenPair} {position.leverage}
            </Text>
          </View>

          {/* Entry Price (Main Value) */}
          <Text
            variant={TextVariant.HeadingLG}
            color={TextColor.Default}
            style={styles.entryPrice}
          >
            {formatCurrency(position.entryPrice)}
          </Text>

          {/* 24h Price Change */}
          <View style={styles.priceChangeContainer}>
            <Text
              variant={TextVariant.BodyLGMedium}
              style={[
                styles.priceChange,
                isPositiveChange
                  ? styles.priceChangePositive
                  : styles.priceChangeNegative,
              ]}
            >
              {isPositiveChange ? '+' : ''}
              {formatCurrency(position.priceChange24h)} (
              {isPositiveChange ? '+' : ''}
              {position.priceChangePercent24h.toFixed(2)}%)
            </Text>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              style={styles.timeInterval}
            >
              24h
            </Text>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.chartPlaceholder}
          >
            WebSocket: {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.chartSubtext}
          >
            {candleSubscribedRef.current
              ? `Subscribed to ${position.assetSymbol} candle data`
              : 'Subscribing to candle data...'}
          </Text>

          {/* Candle Data Display */}
          {isLoadingHistory ? (
            <View style={styles.candleDataSection}>
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Muted}
                style={styles.candleTitle}
              >
                Loading historical data...
              </Text>
            </View>
          ) : candleData && candleData.candles.length > 0 ? (
            <View style={styles.candleDataSection}>
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Default}
                style={styles.candleTitle}
              >
                Candle Data ({candleData.candles.length} candles):
              </Text>
              <Text
                variant={TextVariant.BodyXS}
                color={TextColor.Muted}
                style={styles.candleData}
              >
                Latest: $
                {parseFloat(
                  candleData.candles[candleData.candles.length - 1].close,
                ).toFixed(2)}
              </Text>
              <Text
                variant={TextVariant.BodyXS}
                color={TextColor.Muted}
                style={styles.candleData}
              >
                24h Range: $
                {Math.min(
                  ...candleData.candles
                    .slice(-24)
                    .map((c) => parseFloat(c.low)),
                ).toFixed(2)}{' '}
                - $
                {Math.max(
                  ...candleData.candles
                    .slice(-24)
                    .map((c) => parseFloat(c.high)),
                ).toFixed(2)}
              </Text>
              <Text
                variant={TextVariant.BodyXS}
                color={TextColor.Muted}
                style={styles.candleData}
              >
                Volume (Latest):{' '}
                {parseFloat(
                  candleData.candles[candleData.candles.length - 1].volume,
                ).toFixed(4)}{' '}
                BTC
              </Text>
            </View>
          ) : (
            <View style={styles.candleDataSection}>
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Muted}
                style={styles.candleTitle}
              >
                No candle data available
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsSection}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Auto}
            label="Edit Position"
            onPress={handleEditPosition}
            style={styles.actionButton}
          />
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Auto}
            label="Close Position"
            onPress={handleClosePosition}
            style={styles.actionButton}
          />
        </View>

        {/* Position Details */}
        <View style={styles.detailsSection}>
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.sectionTitle}
          >
            Position Details
          </Text>
          <PerpsPositionListItem position={position} buttonsConfig={[]} />
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.sectionTitle}
          >
            Stats
          </Text>
          <View style={styles.statsGrid}>
            {statsData.map((item, index) => (
              <View key={index} style={styles.statItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Muted}
                  style={styles.statLabel}
                >
                  {item.label}
                </Text>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                  style={styles.statValue}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Back Button */}
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Back to Positions"
            onPress={handleBackToPositions}
          />
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsDetailPage;
