import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import { createLivelineChartTemplate } from './LivelineChartTemplate';
import {
  parseWebViewMessage,
  type LivelineChartProps,
  type RNToWebViewMessage,
} from './LivelineChart.types';

const DEFAULT_CHART_HEIGHT = 250;

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
  const tw = useTailwind();
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  const containerStyle = useMemo(
    () =>
      tw.style('w-full', {
        height,
        backgroundColor: theme.colors.background.default,
      }),
    [height, theme.colors.background.default, tw],
  );

  const webViewStyle = useMemo(
    () =>
      tw.style('flex-1', {
        backgroundColor: theme.colors.background.default,
      }),
    [theme.colors.background.default, tw],
  );

  const overlayStyle = useMemo(
    () =>
      tw.style('absolute top-0 right-0 bottom-0 left-0', {
        backgroundColor: theme.colors.background.default,
      }),
    [theme.colors.background.default, tw],
  );

  const errorTextStyle = useMemo(
    () =>
      tw.style({
        color: theme.colors.error.default,
        textAlign: 'center',
      }),
    [theme.colors.error.default, tw],
  );

  const loadingTextStyle = useMemo(
    () =>
      tw.style('mt-3', {
        color: theme.colors.text.muted,
      }),
    [theme.colors.text.muted, tw],
  );

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
    if (!isChartReady) return;

    postMessage({ type: 'SET_DATA', payload: { data, value } });
    postMessage({ type: 'SET_SERIES', payload: { series: series ?? null } });
  }, [data, value, series, isChartReady, postMessage]);

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
    if (!isChartReady) return;
    postMessage({ type: 'SET_PROPS', payload: { candles: candles ?? null } });
  }, [candles, isChartReady, postMessage]);

  useEffect(() => {
    if (!isChartReady) return;
    postMessage({
      type: 'SET_PROPS',
      payload: { liveCandle: liveCandle ?? null },
    });
  }, [liveCandle, isChartReady, postMessage]);

  useEffect(() => {
    if (!isChartReady) return;
    postMessage({
      type: 'SET_PROPS',
      payload: {
        lineData: lineData ?? null,
        lineValue: lineValue ?? null,
      },
    });
  }, [lineData, lineValue, isChartReady, postMessage]);

  // Hidden series (toggled externally by the host)
  useEffect(() => {
    if (!isChartReady) return;
    postMessage({
      type: 'SET_PROPS',
      payload: { hiddenSeriesIds: hiddenSeriesIds ?? null },
    });
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
      <Box
        testID="liveline-chart-error"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        style={containerStyle}
        twClassName="px-5"
      >
        <Text
          testID="liveline-chart-error-message"
          variant={TextVariant.BodyMd}
          style={errorTextStyle}
        >
          Failed to load chart: {webViewError}
        </Text>
      </Box>
    );
  }

  return (
    <Box style={containerStyle}>
      <WebView
        testID="liveline-chart-webview"
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={webViewStyle}
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
        <Box
          testID="liveline-chart-loading"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={overlayStyle}
        >
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
          <Text variant={TextVariant.BodySm} style={loadingTextStyle}>
            Loading chart...
          </Text>
        </Box>
      )}
    </Box>
  );
};

LivelineChart.displayName = 'LivelineChart';

// eslint-disable-next-line import-x/no-default-export
export default LivelineChart;
