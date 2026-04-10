import React from 'react';
import { render, act } from '@testing-library/react-native';
import AdvancedChart from '../AdvancedChart';
import {
  ChartType,
  type OHLCVBar,
  type AdvancedChartRef,
  type PositionLines,
} from '../AdvancedChart.types';

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
    const { getByText } = render(<AdvancedChart ohlcvData={MOCK_BARS} />);
    expect(getByText('Loading chart...')).toBeOnTheScreen();
  });

  it('shows loading overlay when isLoading is true', () => {
    const { getByText } = render(
      <AdvancedChart ohlcvData={MOCK_BARS} isLoading />,
    );
    expect(getByText('Loading chart...')).toBeOnTheScreen();
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

  it('calls onRequestMoreHistory when WebView requests more data', () => {
    const onRequestMoreHistory = jest.fn();
    const { getByTestId } = render(
      <AdvancedChart
        ohlcvData={MOCK_BARS}
        onRequestMoreHistory={onRequestMoreHistory}
      />,
    );

    const webView = getByTestId('mock-webview');
    act(() => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'NEED_MORE_HISTORY',
            payload: { oldestTimestamp: 1000000 },
          }),
        },
      });
    });

    expect(onRequestMoreHistory).toHaveBeenCalledTimes(1);
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
    const { getByTestId, getByText, rerender } = render(
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

    expect(getByText('Loading chart...')).toBeOnTheScreen();

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
    expect(getByText('Loading chart...')).toBeOnTheScreen();
  });
});
