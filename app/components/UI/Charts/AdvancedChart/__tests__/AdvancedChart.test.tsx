import React from 'react';
import { render, act } from '@testing-library/react-native';
import AdvancedChart from '../AdvancedChart';
import { getTokenDetailsLegendOverlay } from '../indicatorColors';
import { AppThemeKey } from '../../../../../util/theme/models';
import {
  ChartType,
  type OHLCVBar,
  type AdvancedChartRef,
  type PositionLines,
  type TradeMarker,
  type PositionLineColors,
} from '../AdvancedChart.types';
import { mockTheme } from '../../../../../util/theme';

const mockInAppBrowserOpen = jest.fn();
const mockIsAvailable = jest.fn().mockResolvedValue(true);

jest.mock('react-native-inappbrowser-reborn', () => {
  const mock = {
    isAvailable: (...args: unknown[]) => mockIsAvailable(...args),
    open: (...args: unknown[]) => mockInAppBrowserOpen(...args),
  };
  return { __esModule: true, default: mock };
});

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const mockPostMessage = jest.fn();

jest.mock('@metamask/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const MockWebView = forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      useImperativeHandle(ref, () => ({
        postMessage: mockPostMessage,
        reload: jest.fn(),
      }));
      return <View testID="mock-webview" {...props} />;
    },
  );
  MockWebView.displayName = 'MockWebView';
  return { WebView: MockWebView };
});

const MOCK_BARS: OHLCVBar[] = [
  { time: 1000000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
  { time: 1000300, open: 11, high: 13, low: 10, close: 12, volume: 200 },
];

describe('AdvancedChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<AdvancedChart ohlcvData={MOCK_BARS} />);
    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();
  });

  it('serializes configured price decimals into the WebView template', () => {
    const { getByTestId } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} priceDecimals={4} />,
    );

    const webView = getByTestId('mock-webview');

    expect(webView.props.source.html).toMatch(/priceDecimals:\s*4/);
  });

  it('keeps loading overlay while isLoading until parent clears it', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} isLoading />,
    );
    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();

    rerender(<AdvancedChart ohlcvData={MOCK_BARS} isLoading={false} />);

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
  });

  it('shows skeleton until CHART_LAYOUT_SETTLED after full SET_OHLCV when chart is ready', () => {
    const altBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];

    const { getByTestId, queryByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} ohlcvSeriesKey="range-a" />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();

    rerender(<AdvancedChart ohlcvData={altBars} ohlcvSeriesKey="range-b" />);

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();

    const webViewAfterRerender = getByTestId('mock-webview');
    act(() => {
      webViewAfterRerender.props.onLoadEnd();
    });
    act(() => {
      webViewAfterRerender.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    act(() => {
      webViewAfterRerender.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
  });

  it('sends OHLCV data on WebView load end', () => {
    const { getByTestId } = render(<AdvancedChart ohlcvData={MOCK_BARS} />);

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: MOCK_BARS },
      }),
    );
  });

  it('includes pagination config in SET_OHLCV_DATA when ohlcvPagination is provided', () => {
    const pagination = {
      nextCursor: 'cursor-abc',
      hasMore: true,
      assetId: 'eip155:1/slip44:60',
      vsCurrency: 'usd',
    };
    const { getByTestId } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} ohlcvPagination={pagination} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: MOCK_BARS, pagination },
      }),
    );
  });

  it('responds noData when older-bars request has no RN handler', () => {
    const { getByTestId } = render(<AdvancedChart ohlcvData={MOCK_BARS} />);
    const webView = getByTestId('mock-webview');

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'FETCH_OLDER_BARS_REQUEST',
            payload: {
              requestId: 'request-1',
              seriesGeneration: 1,
              symbol: 'ETH',
              resolution: '1',
              fromSec: 1000,
              toSec: 2000,
              countBack: 50,
              oldestLoadedTimeMs: 1000000,
            },
          }),
        },
      });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'FETCH_OLDER_BARS_RESPONSE',
        payload: {
          requestId: 'request-1',
          seriesGeneration: 1,
          bars: [],
          noData: true,
          error: 'missing_onFetchOlderBarsRequest',
        },
      }),
    );
  });

  it('includes RN-backed pagination config in SET_OHLCV_DATA when enabled', () => {
    const rnBackedPagination = { enabled: true };
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        rnBackedPagination={rnBackedPagination}
        visibleFromMs={1000000}
        visibleToMs={1000300}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: {
          data: MOCK_BARS,
          rnBackedPagination,
          visibleFromMs: 1000000,
          visibleToMs: 1000300,
        },
      }),
    );
  });

  it('responds to FETCH_OLDER_BARS_REQUEST through the RN handler', async () => {
    const request = {
      requestId: 'older-1',
      seriesGeneration: 2,
      symbol: 'BTC',
      resolution: '60',
      fromSec: 1000,
      toSec: 2000,
      countBack: 50,
      oldestLoadedTimeMs: 1_700_000_000_000,
    };
    const response = {
      requestId: request.requestId,
      seriesGeneration: request.seriesGeneration,
      bars: [
        { time: 900000, open: 8, high: 9, low: 7, close: 8.5, volume: 50 },
      ],
      noData: false,
    };
    const onFetchOlderBarsRequest = jest.fn().mockResolvedValue(response);
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onFetchOlderBarsRequest={onFetchOlderBarsRequest}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'FETCH_OLDER_BARS_REQUEST',
            payload: request,
          }),
        },
      });
    });
    await flushMicrotasks();

    expect(onFetchOlderBarsRequest).toHaveBeenCalledWith(request);
    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'FETCH_OLDER_BARS_RESPONSE',
        payload: response,
      }),
    );
  });

  it('responds with noData when FETCH_OLDER_BARS_REQUEST handler rejects', async () => {
    const request = {
      requestId: 'older-rejected',
      seriesGeneration: 4,
      symbol: 'BTC',
      resolution: '60',
      fromSec: 1000,
      toSec: 2000,
      countBack: 50,
      oldestLoadedTimeMs: 1_700_000_000_000,
    };
    const onFetchOlderBarsRequest = jest
      .fn()
      .mockRejectedValue(new Error('history failed'));
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onFetchOlderBarsRequest={onFetchOlderBarsRequest}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'FETCH_OLDER_BARS_REQUEST',
            payload: request,
          }),
        },
      });
    });
    await flushMicrotasks();

    expect(onFetchOlderBarsRequest).toHaveBeenCalledWith(request);
    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'FETCH_OLDER_BARS_RESPONSE',
        payload: {
          requestId: request.requestId,
          seriesGeneration: request.seriesGeneration,
          bars: [],
          noData: true,
        },
      }),
    );
  });

  it('responds with noData when FETCH_OLDER_BARS_REQUEST has no RN handler', () => {
    const request = {
      requestId: 'older-without-handler',
      seriesGeneration: 3,
      symbol: 'BTC',
      resolution: '60',
      fromSec: 1000,
      toSec: 2000,
      countBack: 50,
      oldestLoadedTimeMs: 1_700_000_000_000,
    };
    const { getByTestId } = render(<AdvancedChart ohlcvData={MOCK_BARS} />);

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'FETCH_OLDER_BARS_REQUEST',
            payload: request,
          }),
        },
      });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'FETCH_OLDER_BARS_RESPONSE',
        payload: {
          requestId: request.requestId,
          seriesGeneration: request.seriesGeneration,
          bars: [],
          noData: true,
          error: 'missing_onFetchOlderBarsRequest',
        },
      }),
    );
  });

  it('does not send stale data when ohlcvSeriesKey changes; waits for fresh data', () => {
    const staleBars: OHLCVBar[] = [
      { time: 1000000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 1000300, open: 11, high: 13, low: 10, close: 12, volume: 200 },
    ];
    const freshBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];

    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={staleBars} ohlcvSeriesKey="range-a" />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    mockPostMessage.mockClear();

    // Time range switch with stale data (same bars, new key) — should NOT send SET_OHLCV_DATA
    rerender(<AdvancedChart ohlcvData={staleBars} ohlcvSeriesKey="range-b" />);

    const setOhlcvCallsAfterKeyChange = mockPostMessage.mock.calls.filter(
      (call) => {
        try {
          return JSON.parse(call[0] as string).type === 'SET_OHLCV_DATA';
        } catch {
          return false;
        }
      },
    );
    expect(setOhlcvCallsAfterKeyChange).toHaveLength(0);

    // Series key remounts the WebView; load must finish before sync runs. Stale wait still applies.
    const webViewAfterKeyChange = getByTestId('mock-webview');
    act(() => {
      webViewAfterKeyChange.props.onLoadEnd();
    });

    expect(
      mockPostMessage.mock.calls.filter((call) => {
        try {
          return JSON.parse(call[0] as string).type === 'SET_OHLCV_DATA';
        } catch {
          return false;
        }
      }),
    ).toHaveLength(0);

    // Fresh data arrives (same key, different bars) — NOW it should send
    mockPostMessage.mockClear();
    rerender(<AdvancedChart ohlcvData={freshBars} ohlcvSeriesKey="range-b" />);

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: freshBars },
      }),
    );

    const realtimeCalls = mockPostMessage.mock.calls.filter((call) => {
      try {
        return JSON.parse(call[0] as string).type === 'REALTIME_UPDATE';
      } catch {
        return false;
      }
    });
    expect(realtimeCalls).toHaveLength(0);
  });

  it('sends fresh data after a series change when the new array arrives before WebView load end', () => {
    const staleBars: OHLCVBar[] = [
      { time: 1000000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 1000300, open: 11, high: 13, low: 10, close: 12, volume: 200 },
    ];
    const freshBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];

    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={staleBars} ohlcvSeriesKey="range-a" />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    mockPostMessage.mockClear();

    rerender(<AdvancedChart ohlcvData={staleBars} ohlcvSeriesKey="range-b" />);
    rerender(<AdvancedChart ohlcvData={freshBars} ohlcvSeriesKey="range-b" />);

    expect(mockPostMessage).not.toHaveBeenCalled();

    const webViewAfterKeyChange = getByTestId('mock-webview');
    act(() => {
      webViewAfterKeyChange.props.onLoadEnd();
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: freshBars },
      }),
    );
  });

  it('sends fresh data when the series key and data change in the SAME render (synchronous data, e.g. perps)', () => {
    const oldBars: OHLCVBar[] = [
      { time: 1000000, open: 10, high: 10, low: 10, close: 10, volume: 0 },
      { time: 1000300, open: 11, high: 11, low: 11, close: 11, volume: 0 },
    ];
    const newBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 20, low: 20, close: 20, volume: 0 },
      { time: 2000300, open: 21, high: 21, low: 21, close: 21, volume: 0 },
    ];

    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={oldBars} ohlcvSeriesKey="perp|1M" />,
    );
    act(() => {
      getByTestId('mock-webview').props.onLoadEnd();
    });

    mockPostMessage.mockClear();

    // Perp-style: a period switch changes the key AND the (already in-memory) data
    // in a single render, while the previous WebView still looks loaded.
    rerender(<AdvancedChart ohlcvData={newBars} ohlcvSeriesKey="perp|1W" />);

    // Must NOT post to the remounting (not-yet-loaded) WebView — that message is
    // dropped and was never re-sent (the original "loading forever" bug).
    expect(mockPostMessage).not.toHaveBeenCalled();

    // Once the new WebView loads, the fresh data is delivered.
    act(() => {
      getByTestId('mock-webview').props.onLoadEnd();
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: newBars },
      }),
    );
  });

  it('reset() clears stale series snapshot so OHLCV sync runs after reload with the same data ref', () => {
    const staleBars: OHLCVBar[] = [
      { time: 1000000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
    ];
    const ref = React.createRef<AdvancedChartRef>();
    const { getByTestId, rerender } = render(
      <AdvancedChart
        ref={ref}
        ohlcvData={staleBars}
        ohlcvSeriesKey="range-a"
      />,
    );

    const webViewInitial = getByTestId('mock-webview');
    act(() => {
      webViewInitial.props.onLoadEnd();
    });

    rerender(
      <AdvancedChart
        ref={ref}
        ohlcvData={staleBars}
        ohlcvSeriesKey="range-b"
      />,
    );

    const webViewAfterKeyChange = getByTestId('mock-webview');
    act(() => {
      webViewAfterKeyChange.props.onLoadEnd();
    });

    mockPostMessage.mockClear();

    act(() => {
      ref.current?.reset();
    });

    const webViewAfterReset = getByTestId('mock-webview');
    act(() => {
      webViewAfterReset.props.onLoadEnd();
    });

    expect(
      mockPostMessage.mock.calls.some((call) => {
        try {
          return JSON.parse(call[0] as string).type === 'SET_OHLCV_DATA';
        } catch {
          return false;
        }
      }),
    ).toBe(true);
  });

  it('exposes addIndicator via ref', () => {
    const ref = React.createRef<AdvancedChartRef>();
    render(<AdvancedChart ref={ref} ohlcvData={MOCK_BARS} />);

    expect(ref.current).toBeTruthy();
    expect(ref.current?.addIndicator).toBeInstanceOf(Function);
    expect(ref.current?.removeIndicator).toBeInstanceOf(Function);
    expect(ref.current?.setChartType).toBeInstanceOf(Function);
    expect(ref.current?.reset).toBeInstanceOf(Function);
    expect(ref.current?.focusTime).toBeInstanceOf(Function);
    expect(ref.current?.pulseTradeMarker).toBeInstanceOf(Function);
  });

  it('sends PULSE_TRADE_MARKER via the pulseTradeMarker ref method', () => {
    const ref = React.createRef<AdvancedChartRef>();
    render(<AdvancedChart ref={ref} ohlcvData={MOCK_BARS} />);

    mockPostMessage.mockClear();
    act(() => {
      ref.current?.pulseTradeMarker('0xabc');
    });
    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'PULSE_TRADE_MARKER',
        payload: { id: '0xabc' },
      }),
    );

    // Empty id is a no-op.
    mockPostMessage.mockClear();
    act(() => {
      ref.current?.pulseTradeMarker('');
    });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('sends FOCUS_TIME with options via the focusTime ref method', () => {
    const ref = React.createRef<AdvancedChartRef>();
    render(<AdvancedChart ref={ref} ohlcvData={MOCK_BARS} />);

    mockPostMessage.mockClear();
    act(() => {
      ref.current?.focusTime(1_700_000_000_000, {
        spanMs: 86_400_000,
        animate: false,
      });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'FOCUS_TIME',
        payload: {
          timeMs: 1_700_000_000_000,
          spanMs: 86_400_000,
          animate: false,
        },
      }),
    );
  });

  it('omits unset options and ignores non-finite times in focusTime', () => {
    const ref = React.createRef<AdvancedChartRef>();
    render(<AdvancedChart ref={ref} ohlcvData={MOCK_BARS} />);

    mockPostMessage.mockClear();
    act(() => {
      ref.current?.focusTime(1_700_000_000_000);
    });
    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'FOCUS_TIME',
        payload: { timeMs: 1_700_000_000_000 },
      }),
    );

    mockPostMessage.mockClear();
    act(() => {
      ref.current?.focusTime(Number.NaN);
    });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('calls onChartReady when chart reports ready', () => {
    const onChartReady = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} onChartReady={onChartReady} />,
    );

    const webView = getByTestId('mock-webview');
    const onMessage = webView.props.onMessage;

    act(() => {
      onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(onChartReady).toHaveBeenCalledTimes(1);
  });

  it('calls onSkeletonHidden once when skeleton overlay is removed', () => {
    const onSkeletonHidden = jest.fn();
    const { getByTestId, queryByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        isLoading
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();
    expect(onSkeletonHidden).not.toHaveBeenCalled();

    rerender(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        isLoading={false}
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);

    rerender(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        isLoading={false}
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);
  });

  it('calls onSkeletonHidden after CHART_LAYOUT_SETTLED when series key changes', () => {
    const altBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];
    const onSkeletonHidden = jest.fn();

    const { getByTestId, queryByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        ohlcvSeriesKey="range-a"
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);
    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();

    onSkeletonHidden.mockClear();
    rerender(
      <AdvancedChart
        ohlcvData={altBars}
        ohlcvSeriesKey="range-b"
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();

    const webViewAfter = getByTestId('mock-webview');
    act(() => {
      webViewAfter.props.onLoadEnd();
    });
    act(() => {
      webViewAfter.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });
    act(() => {
      webViewAfter.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);
  });

  it('does not call onSkeletonHidden when WebView error UI is shown', () => {
    const onSkeletonHidden = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'ERROR',
            payload: { message: 'chart init failed' },
          }),
        },
      });
    });

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(queryByTestId('mock-webview')).not.toBeOnTheScreen();
    expect(onSkeletonHidden).not.toHaveBeenCalled();
  });

  it('delegates pre-ready ERROR to onInitFailed without showing error UI', () => {
    const onInitFailed = jest.fn();
    const onError = jest.fn();
    const { getByTestId, queryByTestId, queryByText } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onInitFailed={onInitFailed}
        onError={onError}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'ERROR',
            payload: {
              message: 'Failed to load TradingView library. URL: bad',
            },
          }),
        },
      });
    });

    expect(onInitFailed).toHaveBeenCalledWith(
      'Failed to load TradingView library. URL: bad',
    );
    expect(onError).not.toHaveBeenCalled();
    expect(queryByText(/Failed to load chart/)).not.toBeOnTheScreen();
    expect(queryByTestId('advanced-chart-skeleton')).toBeOnTheScreen();
    expect(getByTestId('mock-webview')).toBeOnTheScreen();
  });

  it('delegates pre-ready native WebView error to onInitFailed without showing error UI', () => {
    const onInitFailed = jest.fn();
    const onError = jest.fn();
    const { getByTestId, queryByTestId, queryByText } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onInitFailed={onInitFailed}
        onError={onError}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onError?.({
        nativeEvent: { description: 'WebView failed to load' },
      });
    });

    expect(onInitFailed).toHaveBeenCalledWith('WebView failed to load');
    expect(onError).not.toHaveBeenCalled();
    expect(queryByText(/Failed to load chart/)).not.toBeOnTheScreen();
    expect(queryByTestId('advanced-chart-skeleton')).toBeOnTheScreen();
    expect(getByTestId('mock-webview')).toBeOnTheScreen();
  });

  it('shows error UI for pre-ready ERROR when onInitFailed is not set', () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'ERROR',
            payload: { message: 'early init error' },
          }),
        },
      });
    });

    expect(
      getByText(/Failed to load chart: early init error/),
    ).toBeOnTheScreen();
    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(queryByTestId('mock-webview')).not.toBeOnTheScreen();
  });

  it('calls onError when chart reports an error', () => {
    const onError = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} onError={onError} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'ERROR',
            payload: { message: 'test error' },
          }),
        },
      });
    });

    expect(onError).toHaveBeenCalledWith('test error');
  });

  it('does not destroy the chart for errors after CHART_READY', () => {
    const onError = jest.fn();
    const { getByTestId, queryByText } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} onError={onError} />,
    );

    const webView = getByTestId('mock-webview');

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Failed to add indicator: timeout' },
          }),
        },
      });
    });

    expect(onError).toHaveBeenCalledWith('Failed to add indicator: timeout');
    expect(queryByText(/Failed to load chart/)).not.toBeOnTheScreen();
    expect(getByTestId('mock-webview')).toBeOnTheScreen();
  });

  it('calls onCrosshairMove when crosshair data arrives', () => {
    const onCrosshairMove = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} onCrosshairMove={onCrosshairMove} />,
    );

    const webView = getByTestId('mock-webview');
    const crosshairData = {
      time: 1000000,
      open: 10,
      high: 12,
      low: 9,
      close: 11,
      volume: 100,
    };

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'CROSSHAIR_MOVE',
            payload: { data: crosshairData },
          }),
        },
      });
    });

    expect(onCrosshairMove).toHaveBeenCalledWith(crosshairData);
  });

  it('calls onChartInteracted when WebView posts CHART_INTERACTED', () => {
    const onChartInteracted = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onChartInteracted={onChartInteracted}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'CHART_INTERACTED',
            payload: { interaction_type: 'zoom' },
          }),
        },
      });
    });

    expect(onChartInteracted).toHaveBeenCalledWith({
      interaction_type: 'zoom',
    });
  });

  it('opens browser and fires analytics when WebView onOpenWindow fires', async () => {
    jest.mocked(Date.now).mockReturnValue(10000);
    const onChartTradingViewClicked = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onChartTradingViewClicked={onChartTradingViewClicked}
      />,
    );

    const webView = getByTestId('mock-webview');
    const url = 'https://www.tradingview.com/widget';
    act(() => {
      webView.props.onOpenWindow({ nativeEvent: { targetUrl: url } });
    });

    await act(flushMicrotasks);

    expect(onChartTradingViewClicked).toHaveBeenCalledTimes(1);
    expect(mockInAppBrowserOpen).toHaveBeenCalledWith(url);
  });

  it('debounces duplicate onOpenWindow events', async () => {
    jest.mocked(Date.now).mockReturnValue(10000);
    const onChartTradingViewClicked = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onChartTradingViewClicked={onChartTradingViewClicked}
      />,
    );

    const webView = getByTestId('mock-webview');
    const url = 'https://www.tradingview.com/chart';
    act(() => {
      webView.props.onOpenWindow({ nativeEvent: { targetUrl: url } });
      webView.props.onOpenWindow({ nativeEvent: { targetUrl: url } });
    });

    await act(flushMicrotasks);

    expect(mockInAppBrowserOpen).toHaveBeenCalledTimes(1);
    expect(onChartTradingViewClicked).toHaveBeenCalledTimes(1);
  });

  it('fires analytics when WebView posts CHART_TRADINGVIEW_CLICKED with url payload', async () => {
    jest.mocked(Date.now).mockReturnValue(10000);
    const onChartTradingViewClicked = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onChartTradingViewClicked={onChartTradingViewClicked}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'CHART_TRADINGVIEW_CLICKED',
            payload: { url: 'https://www.tradingview.com/from-bridge' },
          }),
        },
      });
    });

    await act(flushMicrotasks);

    expect(mockInAppBrowserOpen).toHaveBeenCalledWith(
      'https://www.tradingview.com/from-bridge',
    );
    expect(onChartTradingViewClicked).toHaveBeenCalledTimes(1);
  });

  it('sends SET_POSITION_LINES when positionLines prop changes', () => {
    const position: PositionLines = {
      side: 'long',
      entryPrice: 1991.7,
      liquidationPrice: 1357.83,
    };

    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} />,
    );

    // Simulate chart ready
    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(<AdvancedChart ohlcvData={MOCK_BARS} positionLines={position} />);

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_POSITION_LINES',
        payload: { position },
      }),
    );
  });

  it('sends initial SET_POSITION_LINES after chart ready when positionLines are already present', () => {
    const position: PositionLines = {
      side: 'long',
      currentPrice: 1991.7,
      entryPrice: 1900,
    };
    const positionLineColors: PositionLineColors = {
      currentPrice: 'current-price-color',
      entry: 'entry-color',
      takeProfit: 'take-profit-color',
      stopLoss: 'stop-loss-color',
      liquidation: 'liquidation-color',
    };

    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        positionLines={position}
        positionLineColors={positionLineColors}
      />,
    );

    mockPostMessage.mockClear();

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_POSITION_LINES',
        payload: {
          position,
          positionLineColors,
        },
      }),
    );
  });

  it('sends SET_POSITION_LINES with null when positionLines cleared', () => {
    const position: PositionLines = {
      side: 'long',
      entryPrice: 1991.7,
    };

    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} positionLines={position} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(<AdvancedChart ohlcvData={MOCK_BARS} positionLines={undefined} />);

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_POSITION_LINES',
        payload: { position: null },
      }),
    );
  });

  it('resends SET_POSITION_LINES when only positionLineColors values change', () => {
    const position: PositionLines = {
      side: 'long',
      entryPrice: 1991.7,
      liquidationPrice: 1357.83,
    };
    const initialColors: PositionLineColors = {
      entry: 'entry-color',
      takeProfit: 'take-profit-color',
      stopLoss: 'stop-loss-color',
      liquidation: 'liquidation-color',
    };
    const updatedColors: PositionLineColors = {
      ...initialColors,
      liquidation: 'updated-liquidation-color',
    };

    const { getByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        positionLines={position}
        positionLineColors={initialColors}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        positionLines={position}
        positionLineColors={updatedColors}
      />,
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_POSITION_LINES',
        payload: {
          position,
          positionLineColors: updatedColors,
        },
      }),
    );
  });

  it('sends SET_TRADE_MARKERS when tradeMarkers prop changes', () => {
    const markers: TradeMarker[] = [
      { time: 1000000, price: 11, intent: 'enter', id: '0xabc' },
      { time: 1000300, price: 12, intent: 'exit', id: '0xdef' },
    ];

    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(<AdvancedChart ohlcvData={MOCK_BARS} tradeMarkers={markers} />);

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_TRADE_MARKERS',
        payload: { markers },
      }),
    );
  });

  it('sends SET_TRADE_MARKERS with null when tradeMarkers cleared', () => {
    const markers: TradeMarker[] = [
      { time: 1000000, price: 11, intent: 'enter', id: '0xabc' },
    ];

    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} tradeMarkers={markers} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(<AdvancedChart ohlcvData={MOCK_BARS} tradeMarkers={undefined} />);

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_TRADE_MARKERS',
        payload: { markers: null },
      }),
    );
  });

  it('sends REALTIME_UPDATE when realtimeBar changes', () => {
    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    const newBar: OHLCVBar = {
      time: 1000600,
      open: 12,
      high: 14,
      low: 11,
      close: 13,
      volume: 300,
    };

    rerender(<AdvancedChart ohlcvData={MOCK_BARS} realtimeBar={newBar} />);

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'REALTIME_UPDATE',
        payload: { bar: newBar },
      }),
    );
  });

  it('sends SET_SUB_PANE_LAYOUT with null by default after CHART_READY', () => {
    const { getByTestId } = render(<AdvancedChart ohlcvData={MOCK_BARS} />);

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_SUB_PANE_LAYOUT',
        payload: { heightRatio: null },
      }),
    );
  });

  it('sends SET_SUB_PANE_LAYOUT when subPaneHeightRatio prop is set', () => {
    const { getByTestId } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} subPaneHeightRatio={0.25} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_SUB_PANE_LAYOUT',
        payload: { heightRatio: 0.25 },
      }),
    );
  });

  it('sends SET_CHART_TYPE when chartType prop changes', () => {
    const { getByTestId, rerender } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} chartType={ChartType.Candles} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(
      <AdvancedChart ohlcvData={MOCK_BARS} chartType={ChartType.Line} />,
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_CHART_TYPE',
        payload: { type: ChartType.Line },
      }),
    );
  });

  it('includes current price and volume colors in SET_THEME_COLORS updates', async () => {
    const currentPriceColor = mockTheme.colors.text.default;
    const volumeSuccessColor = 'rgba(0, 255, 0, 0.3)';
    const volumeErrorColor = 'rgba(255, 0, 0, 0.3)';
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        currentPriceLineColorOverride={currentPriceColor}
        volumeSuccessColorOverride={volumeSuccessColor}
        volumeErrorColorOverride={volumeErrorColor}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    await flushMicrotasks();

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_THEME_COLORS',
        payload: {
          lineColor: mockTheme.colors.success.default,
          successColor: mockTheme.colors.success.default,
          errorColor: mockTheme.colors.error.default,
          currentPriceColor,
          volumeSuccessColor,
          volumeErrorColor,
        },
      }),
    );
  });

  it('resets chart state when htmlContent changes so sync effects re-fire', () => {
    const onChartReady = jest.fn();
    const { getByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onChartReady={onChartReady}
        enableDrawingTools={false}
        indicators={['RSI']}
      />,
    );

    const webView = getByTestId('mock-webview');

    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(onChartReady).toHaveBeenCalledTimes(1);
    mockPostMessage.mockClear();

    rerender(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onChartReady={onChartReady}
        enableDrawingTools
        indicators={['RSI']}
      />,
    );

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();

    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(onChartReady).toHaveBeenCalledTimes(2);

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    const addIndicatorCall = mockPostMessage.mock.calls.find((call) => {
      const parsed = JSON.parse(call[0] as string);
      return parsed.type === 'ADD_INDICATOR' && parsed.payload.name === 'RSI';
    });
    expect(addIndicatorCall).toBeDefined();
  });

  it('displays error screen for errors before CHART_READY', () => {
    const { getByTestId, getByText } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Load failed' },
          }),
        },
      });
    });

    expect(getByText(/Load failed/)).toBeOnTheScreen();
  });

  it('recovers from error state when reset() is called via ref', () => {
    const ref = React.createRef<AdvancedChartRef>();
    const { getByTestId, getByText, queryByText } = render(
      <AdvancedChart ref={ref} ohlcvData={MOCK_BARS} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Load failed' },
          }),
        },
      });
    });

    expect(getByText(/Load failed/)).toBeOnTheScreen();

    act(() => {
      ref.current?.reset();
    });

    expect(queryByText(/Load failed/)).not.toBeOnTheScreen();
    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();
  });

  it('waits for indicator and legend WebView messages before hiding skeleton', () => {
    const onSkeletonHidden = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        indicators={['RSI', 'MACD']}
        legendOverlay={getTokenDetailsLegendOverlay(AppThemeKey.dark)}
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();
    expect(onSkeletonHidden).not.toHaveBeenCalled();

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'INDICATOR_ADDED',
            payload: { name: 'RSI', id: 'rsi-1' },
          }),
        },
      });
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'INDICATOR_ADDED',
            payload: { name: 'MACD', id: 'macd-1' },
          }),
        },
      });
    });

    expect(getByTestId('advanced-chart-skeleton')).toBeOnTheScreen();

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'LEGEND_RENDERED', payload: {} }),
        },
      });
    });

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);

    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'INDICATOR_REMOVED',
            payload: { name: 'RSI' },
          }),
        },
      });
    });
  });

  it('calls onChartLayoutSettled when CHART_LAYOUT_SETTLED is received', () => {
    const onChartLayoutSettled = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onChartLayoutSettled={onChartLayoutSettled}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    expect(onChartLayoutSettled).toHaveBeenCalledTimes(1);
  });

  it('removeIndicator does not postMessage before chart is ready', () => {
    const ref = React.createRef<AdvancedChartRef>();
    render(<AdvancedChart ref={ref} ohlcvData={MOCK_BARS} />);

    act(() => {
      ref.current?.removeIndicator('RSI');
    });

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('removeIndicator posts REMOVE_INDICATOR when chart is ready', () => {
    const ref = React.createRef<AdvancedChartRef>();
    const { getByTestId } = render(
      <AdvancedChart ref={ref} ohlcvData={MOCK_BARS} />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    act(() => {
      ref.current?.removeIndicator('RSI');
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'REMOVE_INDICATOR',
        payload: { name: 'RSI' },
      }),
    );
  });

  it('with webViewInstanceKey, does not require onLoadEnd after ohlcvSeriesKey change', () => {
    const staleBars: OHLCVBar[] = [
      { time: 1000000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 1000300, open: 11, high: 13, low: 10, close: 12, volume: 200 },
    ];
    const freshBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];

    const { getByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={staleBars}
        ohlcvSeriesKey="range-a"
        webViewInstanceKey="asset|usd"
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(
      <AdvancedChart
        ohlcvData={staleBars}
        ohlcvSeriesKey="range-b"
        webViewInstanceKey="asset|usd"
      />,
    );
    rerender(
      <AdvancedChart
        ohlcvData={freshBars}
        ohlcvSeriesKey="range-b"
        webViewInstanceKey="asset|usd"
      />,
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: freshBars },
      }),
    );
  });

  it('with webViewInstanceKey, does not show skeleton after first reveal on series key change', () => {
    const altBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];
    const onSkeletonHidden = jest.fn();

    const { getByTestId, queryByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        ohlcvSeriesKey="range-a"
        webViewInstanceKey="asset|usd"
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);
    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();

    rerender(
      <AdvancedChart
        ohlcvData={altBars}
        ohlcvSeriesKey="range-b"
        webViewInstanceKey="asset|usd"
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);
  });

  it('with webViewInstanceKey, waits for fresh OHLCV without remounting WebView', () => {
    const staleBars: OHLCVBar[] = [
      { time: 1000000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 1000300, open: 11, high: 13, low: 10, close: 12, volume: 200 },
    ];
    const freshBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];

    const { getByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={staleBars}
        ohlcvSeriesKey="range-a"
        webViewInstanceKey="asset|usd"
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(
      <AdvancedChart
        ohlcvData={staleBars}
        ohlcvSeriesKey="range-b"
        webViewInstanceKey="asset|usd"
      />,
    );

    expect(
      mockPostMessage.mock.calls.filter((call) => {
        try {
          return JSON.parse(call[0] as string).type === 'SET_OHLCV_DATA';
        } catch {
          return false;
        }
      }),
    ).toHaveLength(0);

    mockPostMessage.mockClear();
    rerender(
      <AdvancedChart
        ohlcvData={freshBars}
        ohlcvSeriesKey="range-b"
        webViewInstanceKey="asset|usd"
      />,
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: freshBars },
      }),
    );
  });

  it('with webViewInstanceKey, calls onChartLayoutSettled on interval refresh without calling onSkeletonHidden again', () => {
    const altBars: OHLCVBar[] = [
      { time: 2000000, open: 20, high: 22, low: 19, close: 21, volume: 400 },
      { time: 2000300, open: 21, high: 23, low: 20, close: 22, volume: 500 },
    ];
    const onSkeletonHidden = jest.fn();
    const onChartLayoutSettled = jest.fn();

    const { getByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        ohlcvSeriesKey="range-a"
        webViewInstanceKey="asset|usd"
        onSkeletonHidden={onSkeletonHidden}
        onChartLayoutSettled={onChartLayoutSettled}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);

    onSkeletonHidden.mockClear();
    onChartLayoutSettled.mockClear();

    rerender(
      <AdvancedChart
        ohlcvData={altBars}
        ohlcvSeriesKey="range-b"
        webViewInstanceKey="asset|usd"
        onSkeletonHidden={onSkeletonHidden}
        onChartLayoutSettled={onChartLayoutSettled}
      />,
    );

    act(() => {
      getByTestId('mock-webview').props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    expect(onSkeletonHidden).not.toHaveBeenCalled();
    expect(onChartLayoutSettled).toHaveBeenCalledTimes(1);
  });

  it('with webViewInstanceKey, requires WebView load after webViewInstanceKey change', () => {
    const { getByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        ohlcvSeriesKey="range-a"
        webViewInstanceKey="asset-a|usd"
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_LAYOUT_SETTLED', payload: {} }),
        },
      });
    });

    mockPostMessage.mockClear();

    rerender(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        ohlcvSeriesKey="range-a"
        webViewInstanceKey="asset-b|usd"
      />,
    );

    expect(
      mockPostMessage.mock.calls.filter((call) => {
        try {
          return JSON.parse(call[0] as string).type === 'SET_OHLCV_DATA';
        } catch {
          return false;
        }
      }),
    ).toHaveLength(0);

    const webViewAfterInstanceChange = getByTestId('mock-webview');
    act(() => {
      webViewAfterInstanceChange.props.onLoadEnd();
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: { data: MOCK_BARS },
      }),
    );
  });

  it('does not show skeleton when adding indicators after initial reveal', () => {
    const onSkeletonHidden = jest.fn();
    const { getByTestId, queryByTestId, rerender } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        indicators={[]}
        legendOverlay={getTokenDetailsLegendOverlay(AppThemeKey.dark)}
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onLoadEnd();
    });
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: 'CHART_READY', payload: {} }),
        },
      });
    });

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);

    rerender(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        indicators={['RSI']}
        legendOverlay={getTokenDetailsLegendOverlay(AppThemeKey.dark)}
        onSkeletonHidden={onSkeletonHidden}
      />,
    );

    expect(queryByTestId('advanced-chart-skeleton')).not.toBeOnTheScreen();
    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);
  });
});
