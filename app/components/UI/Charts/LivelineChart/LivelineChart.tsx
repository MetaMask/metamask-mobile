import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet, { DEFAULT_CHART_HEIGHT } from './LivelineChart.styles';
import { createLivelineChartTemplate } from './LivelineChartTemplate';
import {
  parseWebViewMessage,
  type LivelineChartProps,
  type RNToWebViewMessage,
} from './LivelineChart.types';

const LivelineChart: React.FC<LivelineChartProps> = ({
  // Data
  data,
  value,
  series,

  // Appearance
  theme: chartTheme = 'dark',
  color,
  lineWidth,
  height = DEFAULT_CHART_HEIGHT,

  // Feature flags
  grid,
  badge,
  badgeTail,
  badgeVariant,
  momentum,
  fill,
  loading = false,
  paused,
  emptyText,
  scrub,
  exaggerate,
  showValue,
  valueMomentumColor,
  degen,
  pulse,

  // Time window
  window: windowSecs,

  // Crosshair
  tooltipY,
  tooltipOutline,

  // Reference line
  referenceLine,

  // Orderbook
  orderbook,

  // Formatting (serialised function bodies)
  formatValue,
  formatTime,

  // Layout / animation
  padding,
  lerpSpeed,

  // Multi-series visibility
  hiddenSeriesIds,

  // Candlestick mode
  mode,
  candles,
  candleWidth,
  liveCandle,
  lineData,
  lineValue,

  // RN-only callbacks
  onChartReady,
  onError,
  onHover,
}) => {
  const { styles, theme } = useStyles(styleSheet, { height });
  const webViewRef = useRef<WebView>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Structural props that require a full WebView reload (baked into the HTML).
  // Data, value, series, loading, paused, emptyText, hiddenSeriesIds are sent
  // via postMessage after mount and do NOT belong here.
  const htmlContent = useMemo(
    () =>
      createLivelineChartTemplate(theme, {
        theme: chartTheme,
        color,
        lineWidth,
        grid,
        badge,
        badgeTail,
        badgeVariant,
        momentum,
        fill,
        scrub,
        exaggerate,
        showValue,
        valueMomentumColor,
        degen,
        pulse,
        window: windowSecs,
        tooltipY,
        tooltipOutline,
        referenceLine,
        orderbook,
        formatValue,
        formatTime,
        padding,
        lerpSpeed,
        mode,
        candleWidth,
      }),
    [
      theme,
      chartTheme,
      color,
      lineWidth,
      grid,
      badge,
      badgeTail,
      badgeVariant,
      momentum,
      fill,
      scrub,
      exaggerate,
      showValue,
      valueMomentumColor,
      degen,
      pulse,
      windowSecs,
      tooltipY,
      tooltipOutline,
      referenceLine,
      orderbook,
      formatValue,
      formatTime,
      padding,
      lerpSpeed,
      mode,
      candleWidth,
    ],
  );

  // Reset chart-ready state whenever structural props change and the WebView
  // reloads with new HTML. Without this, postMessage effects would fire against
  // the freshly-mounted WebView before it emits CHART_READY.
  useEffect(() => {
    setIsChartReady(false);
    setWebViewError(null);
  }, [htmlContent]);

  const postMessage = useCallback((message: RNToWebViewMessage) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  // Data / value
  useEffect(() => {
    if (!isChartReady) return;
    postMessage({ type: 'SET_DATA', payload: { data, value } });
  }, [data, value, isChartReady, postMessage]);

  // Multi-series
  useEffect(() => {
    if (!isChartReady || !series) return;
    postMessage({ type: 'SET_SERIES', payload: { series } });
  }, [series, isChartReady, postMessage]);

  // Dynamic props that can change without reloading the WebView
  useEffect(() => {
    if (!isChartReady) return;
    postMessage({
      type: 'SET_PROPS',
      payload: { loading, paused, emptyText },
    });
  }, [loading, paused, emptyText, isChartReady, postMessage]);

  // Candlestick data (streamed the same way as series)
  useEffect(() => {
    if (!isChartReady || !candles) return;
    postMessage({ type: 'SET_PROPS', payload: { candles } });
  }, [candles, isChartReady, postMessage]);

  useEffect(() => {
    if (!isChartReady || liveCandle === undefined) return;
    postMessage({ type: 'SET_PROPS', payload: { liveCandle } });
  }, [liveCandle, isChartReady, postMessage]);

  useEffect(() => {
    if (!isChartReady || lineData === undefined) return;
    postMessage({ type: 'SET_PROPS', payload: { lineData, lineValue } });
  }, [lineData, lineValue, isChartReady, postMessage]);

  // Hidden series (toggled externally by the host)
  useEffect(() => {
    if (!isChartReady) return;
    postMessage({ type: 'SET_PROPS', payload: { hiddenSeriesIds } });
  }, [hiddenSeriesIds, isChartReady, postMessage]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let raw;
      try {
        raw = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      const message = parseWebViewMessage(raw);
      if (!message) return;

      switch (message.type) {
        case 'CHART_READY':
          setIsChartReady(true);
          setWebViewError(null);
          onChartReady?.();
          break;
        case 'ERROR':
          setWebViewError(message.payload.message);
          onError?.(message.payload.message);
          break;
        case 'HOVER':
          onHover?.(message.payload);
          break;
        default:
          break;
      }
    },
    [onChartReady, onError, onHover],
  );

  const handleWebViewError = useCallback(
    (syntheticEvent: { nativeEvent: { description: string } }) => {
      const { description } = syntheticEvent.nativeEvent;
      setWebViewError(description);
      onError?.(description);
    },
    [onError],
  );

  if (webViewError) {
    return (
      <View testID="liveline-chart-error" style={styles.errorContainer}>
        <Text variant={TextVariant.BodyMd} style={styles.errorText}>
          Failed to load chart: {webViewError}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        testID="liveline-chart-webview"
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        onError={handleWebViewError}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        allowsInlineMediaPlayback
        androidLayerType="hardware"
        mixedContentMode="always"
      />

      {!isChartReady && (
        <View testID="liveline-chart-loading" style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
          <Text variant={TextVariant.BodySm} style={styles.loadingText}>
            Loading chart...
          </Text>
        </View>
      )}
    </View>
  );
};

LivelineChart.displayName = 'LivelineChart';

// eslint-disable-next-line import-x/no-default-export
export default LivelineChart;
