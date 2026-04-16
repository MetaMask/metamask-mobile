import React from 'react';
import { render, act } from '@testing-library/react-native';
import AdvancedChart from '../AdvancedChart';
import {
  ChartType,
  resolveLineChromeOptions,
  type OHLCVBar,
  type AdvancedChartRef,
  type PositionLines,
} from '../AdvancedChart.types';

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

  it('sends SET_LINE_CHROME with resolved defaults after onLoadEnd and CHART_READY', () => {
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
        type: 'SET_LINE_CHROME',
        payload: resolveLineChromeOptions(),
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
});
