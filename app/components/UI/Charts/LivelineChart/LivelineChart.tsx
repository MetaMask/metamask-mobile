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
import { REACT_LIB, REACT_DOM_LIB, LIVELINE_LIB } from './LivelineChartAssets';
import {
  parseWebViewMessage,
  type LivelineChartProps,
  type RNToWebViewMessage,
} from './LivelineChart.types';

export const DEFAULT_CHART_HEIGHT = 250;

const LivelineChart: React.FC<LivelineChartProps> = ({
  height = DEFAULT_CHART_HEIGHT,
  onChartReady,
  onError,
  onHover,
  onWindowChange,
  onModeChange,
  onSeriesToggle,
  ...chartProps
}) => {
  const tw = useTailwind();
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

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

  // Send the full props snapshot to the WebView whenever any chart prop
  // changes. The WebView calls root.render(<Liveline {...props} />) on receipt,
  // letting React's own reconciler diff and update.
  //
  // chartProps is destructured from the component props so it is a new object
  // on every render; we JSON-serialise it to get a stable dep-comparable value.
  const chartPropsJson = JSON.stringify({
    ...chartProps,
    theme: theme.themeAppearance,
  });
  useEffect(() => {
    if (!isChartReady) return;
    // chartPropsJson is the stable dep; parse it back so the payload is a
    // plain object (avoids sending the stale chartProps closure value).
    postMessage({
      type: 'SET_PROPS',
      payload: JSON.parse(chartPropsJson),
    });
  }, [isChartReady, postMessage, chartPropsJson]);

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
        case 'WINDOW_CHANGE':
          onWindowChange?.(message.payload.secs);
          break;
        case 'MODE_CHANGE':
          onModeChange?.(message.payload.mode);
          break;
        case 'SERIES_TOGGLE':
          onSeriesToggle?.(message.payload.id, message.payload.visible);
          break;
        default:
          break;
      }
    },
    [
      onChartReady,
      onError,
      onHover,
      onWindowChange,
      onModeChange,
      onSeriesToggle,
    ],
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

      {!isChartReady && (
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
          <Text variant={TextVariant.BodySm} twClassName="mt-3 text-text-muted">
            Loading chart...
          </Text>
        </Box>
      )}
    </Box>
  );
};

LivelineChart.displayName = 'LivelineChart';

export default LivelineChart;
