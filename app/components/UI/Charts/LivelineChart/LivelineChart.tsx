import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
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
import Logger from '../../../../util/Logger';
import { useTheme } from '../../../../util/theme';
import { createLivelineChartTemplate } from './LivelineChartTemplate';
import { REACT_LIB, REACT_DOM_LIB, LIVELINE_LIB } from './LivelineChartAssets';
import {
  parseWebViewMessage,
  type LivelineChartProps,
  type LivelineChartRef,
  type RNToWebViewMessage,
} from './LivelineChart.types';

export const DEFAULT_CHART_HEIGHT = 250;

const LivelineChart = forwardRef<LivelineChartRef, LivelineChartProps>(
  (
    {
      height = DEFAULT_CHART_HEIGHT,
      onChartReady,
      onError,
      onHover,
      onWindowChange,
      onModeChange,
      onSeriesToggle,
      ...chartProps
    },
    ref,
  ) => {
    const tw = useTailwind();
    const theme = useTheme();
    const webViewRef = useRef<WebView>(null);
    const [isChartReady, setIsChartReady] = useState(false);
    const [webViewError, setWebViewError] = useState<string | null>(null);
    const isChartReadyRef = useRef(false);
    const pendingRef = useRef<RNToWebViewMessage[]>([]);
    const hasFlushedRef = useRef(false);
    // Tracks the newest data-point timestamp already pushed to the WebView and
    // the last serialized config, so high-frequency tick updates can be sent as
    // cheap APPEND_POINT deltas instead of re-serializing the whole dataset in a
    // SET_PROPS payload on every render (~60Hz live stream).
    const lastSentTimeRef = useRef<number | null>(null);
    const prevConfigJsonRef = useRef<string | null>(null);
    const callbacksRef = useRef({
      onChartReady,
      onError,
      onHover,
      onWindowChange,
      onModeChange,
      onSeriesToggle,
    });

    callbacksRef.current = {
      onChartReady,
      onError,
      onHover,
      onWindowChange,
      onModeChange,
      onSeriesToggle,
    };

    const htmlContent = useMemo(
      () =>
        createLivelineChartTemplate(
          theme,
          REACT_LIB,
          REACT_DOM_LIB,
          LIVELINE_LIB,
        ),
      [theme],
    );

    const postMessage = useCallback((message: RNToWebViewMessage) => {
      webViewRef.current?.postMessage(JSON.stringify(message));
    }, []);

    const flushPendingMessages = useCallback(() => {
      if (hasFlushedRef.current) return;
      hasFlushedRef.current = true;
      const queued = pendingRef.current;
      pendingRef.current = [];
      if (queued.length === 0) return;
      queued.forEach((msg) => postMessage(msg));
    }, [postMessage]);

    useImperativeHandle(
      ref,
      () => ({
        appendPoint: (point, value) => {
          const msg: RNToWebViewMessage = {
            type: 'APPEND_POINT',
            payload: { point, value },
          };
          if (!isChartReadyRef.current) {
            pendingRef.current.push(msg);
            return;
          }
          postMessage(msg);
        },
        clearData: () => {
          if (!isChartReadyRef.current) {
            pendingRef.current = pendingRef.current.filter(
              (message) =>
                message.type !== 'APPEND_POINT' &&
                message.type !== 'CLEAR_DATA',
            );
            pendingRef.current.push({ type: 'CLEAR_DATA' });
            return;
          }
          postMessage({ type: 'CLEAR_DATA' });
        },
      }),
      [postMessage],
    );

    useEffect(() => {
      setIsChartReady(false);
      isChartReadyRef.current = false;
      hasFlushedRef.current = false;
      pendingRef.current = [];
      // A WebView reload throws away the chart's in-memory series, so the next
      // sync must be a full SET_PROPS rather than an append delta.
      lastSentTimeRef.current = null;
      prevConfigJsonRef.current = null;
      setWebViewError(null);
    }, [htmlContent]);

    const shouldShowNativeLoading = !isChartReady || chartProps.loading;

    useEffect(() => {
      if (!isChartReady) return;

      const { value } = chartProps;
      const points = chartProps.data ?? [];
      // Config = everything except the high-frequency series + scalar value, so
      // we only treat genuine config edits (color, window, loading, …) as a
      // reason to resend a full SET_PROPS payload.
      const configJson = JSON.stringify({
        ...chartProps,
        data: undefined,
        value: undefined,
        theme: theme.themeAppearance,
      });
      const configChanged = prevConfigJsonRef.current !== configJson;
      const newestTime = points.length ? points[points.length - 1].time : null;

      // Locate the previously-sent newest point in the current series. If it is
      // still present, the series is a continuation (points were appended at the
      // tail, possibly trimmed at the front) and we can stream just the new
      // points. If it is absent, the series was replaced/reset and we must send
      // a full SET_PROPS so the WebView doesn't append onto a stale series.
      let continuationIndex = -1;
      if (lastSentTimeRef.current !== null) {
        for (let i = points.length - 1; i >= 0; i--) {
          if (points[i].time === lastSentTimeRef.current) {
            continuationIndex = i;
            break;
          }
        }
      }

      const canAppend = !configChanged && continuationIndex !== -1;

      if (canAppend) {
        for (let i = continuationIndex + 1; i < points.length; i++) {
          postMessage({
            type: 'APPEND_POINT',
            payload: { point: points[i], value },
          });
        }
      } else {
        postMessage({
          type: 'SET_PROPS',
          payload: { ...chartProps, theme: theme.themeAppearance },
        });
      }

      prevConfigJsonRef.current = configJson;
      lastSentTimeRef.current = newestTime;
    }, [isChartReady, postMessage, chartProps, theme.themeAppearance]);

    useEffect(() => {
      if (!isChartReady || hasFlushedRef.current) return;
      flushPendingMessages();
    }, [flushPendingMessages, isChartReady]);

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
            isChartReadyRef.current = true;
            setWebViewError(null);
            flushPendingMessages();
            callbacksRef.current.onChartReady?.();
            break;
          case 'ERROR':
            setWebViewError(message.payload.message);
            callbacksRef.current.onError?.(message.payload.message);
            break;
          case 'HOVER':
            callbacksRef.current.onHover?.(message.payload);
            break;
          case 'WINDOW_CHANGE':
            callbacksRef.current.onWindowChange?.(message.payload.secs);
            break;
          case 'MODE_CHANGE':
            callbacksRef.current.onModeChange?.(message.payload.mode);
            break;
          case 'SERIES_TOGGLE':
            callbacksRef.current.onSeriesToggle?.(
              message.payload.id,
              message.payload.visible,
            );
            break;
          case 'PERF':
            if (__DEV__) {
              Logger.log('LivelineChart render', message.payload);
            }
            break;
          default:
            break;
        }
      },
      [flushPendingMessages],
    );

    const handleWebViewError = useCallback(
      (syntheticEvent: { nativeEvent: { description: string } }) => {
        const { description } = syntheticEvent.nativeEvent;
        setWebViewError(description);
        callbacksRef.current.onError?.(description);
      },
      [],
    );

    if (webViewError) {
      return (
        <Box
          testID="liveline-chart-error"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={tw.style('w-full bg-background-default', { height })}
          twClassName="px-5"
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-error-default text-center"
          >
            Failed to load chart: {webViewError}
          </Text>
        </Box>
      );
    }

    return (
      <Box style={tw.style('w-full bg-background-default', { height })}>
        <WebView
          testID="liveline-chart-webview"
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={tw.style('flex-1 bg-background-default')}
          onMessage={handleMessage}
          onError={handleWebViewError}
          originWhitelist={['about:*', 'file:*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          allowsInlineMediaPlayback
          androidLayerType="hardware"
        />

        {/* TODO: Clean up Liveline loading so the WebView empty state never appears between native loading and chart data. */}
        {shouldShowNativeLoading && (
          <Box
            testID="liveline-chart-loading"
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            style={tw.style(
              'absolute top-0 left-0 right-0 bottom-0 bg-background-default',
            )}
          >
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
            />
            <Text
              variant={TextVariant.BodySm}
              twClassName="mt-3 text-text-muted"
            >
              Loading chart...
            </Text>
          </Box>
        )}
      </Box>
    );
  },
);

LivelineChart.displayName = 'LivelineChart';

export default LivelineChart;
