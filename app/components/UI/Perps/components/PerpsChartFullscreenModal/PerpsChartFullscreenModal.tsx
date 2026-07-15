import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { View, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../../../../component-library/hooks';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import TradingViewChart, {
  type TradingViewChartRef,
  type TPSLLines,
  type OhlcData,
} from '../TradingViewChart';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsAdvancedChart from '../PerpsAdvancedChart/PerpsAdvancedChart';
import { PERPS_CHART_CONFIG } from '../../constants/chartConfig';
import PerpsCandlestickChartIntervalSelector from '../PerpsCandlestickChartIntervalSelector/PerpsCandlestickChartIntervalSelector';
import { styleSheet } from './PerpsChartFullscreenModal.styles';
import PerpsOHLCVBar from '../PerpsOHLCVBar';
import ComponentErrorBoundary from '../../../ComponentErrorBoundary';
import { useScreenOrientation } from '../../../../../core/ScreenOrientation';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';

export interface PerpsChartFullscreenModalProps {
  isVisible: boolean;
  candleData?: CandleData | null;
  tpslLines?: TPSLLines;
  selectedInterval: CandlePeriod;
  visibleCandleCount?: number;
  onClose: () => void;
  onIntervalChange: (interval: CandlePeriod) => void;
  /** When true, renders PerpsAdvancedChart instead of TradingViewChart. */
  isAdvancedChartEnabled?: boolean;
  /** Market symbol — required when isAdvancedChartEnabled is true. */
  symbol?: string;
  /** Signed position size string for long/short side derivation. */
  positionSize?: string;
  /** Hyperliquid size decimals; forwarded so fullscreen advanced chart matches market precision. */
  szDecimals?: number | null;
}

const getChartLibrary = (isAdvancedChartEnabled: boolean) =>
  isAdvancedChartEnabled
    ? PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED
    : PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT;

const getChartAnalyticsPropertiesForLibrary = (chartLibrary: string) => ({
  [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: chartLibrary,
  [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
});

const PerpsChartFullscreenModal: React.FC<PerpsChartFullscreenModalProps> = ({
  isVisible,
  candleData,
  tpslLines,
  selectedInterval,
  visibleCandleCount,
  onClose,
  onIntervalChange,
  isAdvancedChartEnabled,
  symbol,
  positionSize,
  szDecimals,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const insets = useSafeAreaInsets();
  const chartRef = React.useRef<TradingViewChartRef>(null);
  const previousIntervalRef = useRef<CandlePeriod | null>(null);
  const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);
  const trackedScreenViewLibrariesRef = useRef<Set<string>>(new Set());
  // Initialize with screen height to avoid flash of incorrect size
  const [chartHeight, setChartHeight] = useState<number>(
    Dimensions.get('window').height *
      PERPS_CHART_CONFIG.LAYOUT.FULLSCREEN_INITIAL_HEIGHT_RATIO,
  );
  const lastHeightRef = useRef<number>(chartHeight);
  // Track OHLCV bar height to subtract from chart height
  const [ohlcvHeight, setOhlcvHeight] = useState<number>(0);
  const { track } = usePerpsEventTracking();
  const configuredChartLibrary = useMemo(
    () => getChartLibrary(Boolean(isAdvancedChartEnabled)),
    [isAdvancedChartEnabled],
  );
  const [effectiveChartLibrary, setEffectiveChartLibrary] = useState(
    configuredChartLibrary,
  );
  useEffect(() => {
    setEffectiveChartLibrary(configuredChartLibrary);
  }, [configuredChartLibrary, isVisible, symbol]);
  const chartAnalyticsProperties = useMemo(
    () => getChartAnalyticsPropertiesForLibrary(effectiveChartLibrary),
    [effectiveChartLibrary],
  );

  // Allow landscape orientation when modal is visible
  // Automatically locks back to portrait when modal closes or unmounts
  useScreenOrientation({ allowLandscape: isVisible });

  // Reset OHLCV height when OHLCV bar disappears
  useEffect(() => {
    if (!ohlcData) {
      setOhlcvHeight(0);
    }
  }, [ohlcData]);

  useEffect(() => {
    if (!isVisible) return;

    trackedScreenViewLibrariesRef.current = new Set();
  }, [configuredChartLibrary, isVisible, symbol]);

  const trackFullscreenChartScreenViewed = useCallback(
    (chartLibrary?: string) => {
      if (!isVisible || !symbol) return;

      const trackedChartLibrary = chartLibrary ?? effectiveChartLibrary;
      if (
        trackedScreenViewLibrariesRef.current.has(
          `${symbol}:${trackedChartLibrary}`,
        )
      ) {
        return;
      }

      trackedScreenViewLibrariesRef.current.add(
        `${symbol}:${trackedChartLibrary}`,
      );
      const screenViewChartAnalyticsProperties = chartLibrary
        ? getChartAnalyticsPropertiesForLibrary(chartLibrary)
        : chartAnalyticsProperties;
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.FULL_SCREEN_CHART,
        [PERPS_EVENT_PROPERTY.ASSET]: symbol,
        ...screenViewChartAnalyticsProperties,
      });
    },
    [chartAnalyticsProperties, effectiveChartLibrary, isVisible, symbol, track],
  );

  useEffect(() => {
    if (
      isVisible &&
      !isAdvancedChartEnabled &&
      candleData?.candles?.length &&
      candleData.interval === selectedInterval
    ) {
      trackFullscreenChartScreenViewed();
    }
  }, [
    candleData,
    isAdvancedChartEnabled,
    isVisible,
    selectedInterval,
    trackFullscreenChartScreenViewed,
  ]);

  // Auto-zoom to latest candle when interval changes and new data arrives
  // This ensures the chart shows the most recent data after interval change
  useEffect(() => {
    // Check if the interval has actually changed
    const hasIntervalChanged = previousIntervalRef.current !== selectedInterval;

    // Only zoom when:
    // 1. The interval has changed (user pressed button)
    // 2. New data exists and matches the selected period
    if (
      hasIntervalChanged &&
      candleData &&
      candleData.interval === selectedInterval
    ) {
      chartRef.current?.zoomToLatestCandle(visibleCandleCount);
      // Update the ref to track this interval change
      previousIntervalRef.current = selectedInterval;
    }
  }, [candleData, selectedInterval, visibleCandleCount]);

  // Close handler - orientation is automatically restored by the hook
  // when isVisible becomes false
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const trackChartError = useCallback(() => {
    track(MetaMetricsEvents.PERPS_ERROR, {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.WARNING,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]:
        'Chart rendering error in fullscreen chart modal',
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.FULL_SCREEN_CHART,
      ...(symbol ? { [PERPS_EVENT_PROPERTY.ASSET]: symbol } : {}),
      ...chartAnalyticsProperties,
    });
  }, [chartAnalyticsProperties, symbol, track]);

  // Handle boundary-level chart errors by closing the modal.
  // Orientation is automatically restored by the hook.
  const handleChartError = useCallback(() => {
    trackChartError();
    onClose();
  }, [onClose, trackChartError]);

  const handleAdvancedChartError = useCallback(() => {
    trackChartError();
    setEffectiveChartLibrary(PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT);
    trackFullscreenChartScreenViewed(
      PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT,
    );
  }, [trackChartError, trackFullscreenChartScreenViewed]);

  const handleAdvancedChartSkeletonHidden = useCallback(() => {
    trackFullscreenChartScreenViewed();
  }, [trackFullscreenChartScreenViewed]);

  return (
    <Modal
      isVisible={isVisible}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={300}
      backdropOpacity={0.3}
      useNativeDriver
      hideModalContentWhileAnimating
      coverScreen
      statusBarTranslucent
    >
      <View
        style={[
          styles.container,
          {
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {/* Header - Single Row with interval selector and close button */}
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <View style={styles.headerTopRow}>
            <PerpsCandlestickChartIntervalSelector
              selectedInterval={selectedInterval}
              onIntervalChange={onIntervalChange}
              style={styles.intervalSelectorWrapper}
            />
            <ButtonIcon
              iconName={IconName.Close}
              iconColor={IconColor.Default}
              size={ButtonIconSizes.Md}
              onPress={handleClose}
              accessibilityLabel="Close"
              testID="perps-chart-fullscreen-close-button"
            />
          </View>
        </View>

        {/* Chart - fills remaining space with bottom safe area padding */}
        <View
          style={[styles.chartContainer, { paddingBottom: insets.bottom }]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            // Subtract bottom inset to prevent WebView from extending into safe area
            // This ensures x-axis labels are visible above Android navigation button
            const newHeight = height - insets.bottom;

            // Debounce: only update if height change is significant OR it's the first real measurement
            // Prevents unnecessary re-renders during animations or minor layout shifts
            const heightDiff = Math.abs(newHeight - lastHeightRef.current);
            const isSignificantChange =
              heightDiff > PERPS_CHART_CONFIG.LAYOUT.HEIGHT_CHANGE_THRESHOLD;
            const isFirstRealMeasurement =
              lastHeightRef.current === chartHeight; // Still at initial estimate

            if (isSignificantChange || isFirstRealMeasurement) {
              lastHeightRef.current = newHeight;
              setChartHeight(newHeight);
            }
          }}
        >
          {/* OHLCV Bar - Shows above chart when interacting */}
          {ohlcData && (
            <View
              style={styles.ohlcvWrapper}
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                setOhlcvHeight(height);
              }}
            >
              <PerpsOHLCVBar
                open={ohlcData.open}
                high={ohlcData.high}
                low={ohlcData.low}
                close={ohlcData.close}
                volume={ohlcData.volume}
                testID="fullscreen-chart-ohlcv-bar"
              />
            </View>
          )}

          <ComponentErrorBoundary
            componentLabel="PerpsChartFullscreenModal"
            onError={handleChartError}
          >
            {isAdvancedChartEnabled && symbol ? (
              <PerpsAdvancedChart
                symbol={symbol}
                interval={selectedInterval}
                visibleCandleCount={
                  visibleCandleCount ??
                  PERPS_CHART_CONFIG.CANDLE_COUNT.FULLSCREEN
                }
                height={Math.max(chartHeight - ohlcvHeight, 100)}
                tpslLines={tpslLines}
                positionSize={positionSize}
                szDecimals={szDecimals}
                surface="full_screen_chart"
                onCrosshairDataChange={setOhlcData}
                onError={handleAdvancedChartError}
                onSkeletonHidden={handleAdvancedChartSkeletonHidden}
                fallbackCandleData={candleData ?? null}
              />
            ) : (
              <TradingViewChart
                ref={chartRef}
                candleData={candleData}
                height={Math.max(chartHeight - ohlcvHeight, 100)}
                tpslLines={tpslLines}
                symbol={symbol}
                visibleCandleCount={
                  visibleCandleCount ??
                  PERPS_CHART_CONFIG.CANDLE_COUNT.FULLSCREEN
                }
                showVolume
                showOverlay={false}
                coloredVolume
                onOhlcDataChange={setOhlcData}
                testID="fullscreen-chart"
              />
            )}
          </ComponentErrorBoundary>
        </View>
      </View>
    </Modal>
  );
};

export default PerpsChartFullscreenModal;
