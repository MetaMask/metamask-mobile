import React from 'react';
import { render, act } from '@testing-library/react-native';
import LivelineChart from '../LivelineChart';
import {
  parseWebViewMessage,
  type LivelinePoint,
  type CandlePoint,
  type LivelineSeries,
  type HoverPoint,
} from '../LivelineChart.types';

const mockPostMessage = jest.fn();

jest.mock('@metamask/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const MockWebView = forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      useImperativeHandle(ref, () => ({ postMessage: mockPostMessage }));
      return <View testID="liveline-chart-webview" {...props} />;
    },
  );
  MockWebView.displayName = 'MockWebView';
  return { WebView: MockWebView };
});

// ---- helpers ----

const MOCK_DATA: LivelinePoint[] = [
  { time: 1700000000, value: 42.5 },
  { time: 1700000030, value: 43.1 },
];

const MOCK_CANDLE: CandlePoint = {
  time: 1700000000,
  open: 42,
  high: 44,
  low: 41,
  close: 43,
};

const MOCK_SERIES: LivelineSeries[] = [
  {
    id: 'series-1',
    data: MOCK_DATA,
    value: 43.1,
    color: 'red',
    label: 'Series A',
  },
];

const fireMessage = (
  webView: { props: Record<string, unknown> },
  payload: unknown,
) => {
  act(() => {
    (webView.props.onMessage as (e: unknown) => void)({
      nativeEvent: { data: JSON.stringify(payload) },
    });
  });
};

// ---- component tests ----

describe('LivelineChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders the WebView', () => {
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      expect(getByTestId('liveline-chart-webview')).toBeOnTheScreen();
    });

    it('shows the loading overlay before chart is ready', () => {
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      expect(getByTestId('liveline-chart-loading')).toBeOnTheScreen();
    });

    it('hides the loading overlay after CHART_READY message', () => {
      const { getByTestId, queryByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'CHART_READY',
        payload: {},
      });

      expect(queryByTestId('liveline-chart-loading')).not.toBeOnTheScreen();
    });
  });

  describe('callbacks', () => {
    it('calls onChartReady when CHART_READY message arrives', () => {
      const onChartReady = jest.fn();
      const { getByTestId } = render(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          onChartReady={onChartReady}
        />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'CHART_READY',
        payload: {},
      });

      expect(onChartReady).toHaveBeenCalledTimes(1);
    });

    it('calls onError when ERROR message arrives', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} onError={onError} />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'ERROR',
        payload: { message: 'render failed' },
      });

      expect(onError).toHaveBeenCalledWith('render failed');
    });

    it('calls onHover with point data when HOVER message arrives', () => {
      const onHover = jest.fn();
      const hoverPoint: HoverPoint = {
        time: 1700000000,
        value: 42.5,
        x: 100,
        y: 50,
      };
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} onHover={onHover} />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'HOVER',
        payload: hoverPoint,
      });

      expect(onHover).toHaveBeenCalledWith(hoverPoint);
    });

    it('calls onHover with null when HOVER payload is null', () => {
      const onHover = jest.fn();
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} onHover={onHover} />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'HOVER',
        payload: null,
      });

      expect(onHover).toHaveBeenCalledWith(null);
    });
  });

  describe('error state', () => {
    it('renders the error container when ERROR message arrives before CHART_READY', () => {
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'ERROR',
        payload: { message: 'load failed' },
      });

      expect(getByTestId('liveline-chart-error')).toBeOnTheScreen();
    });

    it('includes the error message in the error container text', () => {
      const { getByTestId, getByText } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'ERROR',
        payload: { message: 'load failed' },
      });

      expect(getByText(/load failed/)).toBeOnTheScreen();
    });

    it('renders the error container on native WebView error', () => {
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      act(() => {
        (
          getByTestId('liveline-chart-webview').props.onError as (
            e: unknown,
          ) => void
        )({
          nativeEvent: { description: 'connection refused' },
        });
      });

      expect(getByTestId('liveline-chart-error')).toBeOnTheScreen();
    });

    it('calls onError with the description on native WebView error', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} onError={onError} />,
      );

      act(() => {
        (
          getByTestId('liveline-chart-webview').props.onError as (
            e: unknown,
          ) => void
        )({
          nativeEvent: { description: 'connection refused' },
        });
      });

      expect(onError).toHaveBeenCalledWith('connection refused');
    });
  });

  describe('postMessage effects', () => {
    const makeReady = (webView: { props: Record<string, unknown> }) => {
      fireMessage(webView, { type: 'CHART_READY', payload: {} });
    };

    it('sends SET_DATA after CHART_READY', () => {
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');

      makeReady(webView);

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_DATA',
          payload: { data: MOCK_DATA, value: 43.1 },
        }),
      );
    });

    it('sends SET_DATA when data prop changes after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');
      makeReady(webView);
      mockPostMessage.mockClear();

      const newData: LivelinePoint[] = [{ time: 1700000060, value: 50 }];
      rerender(<LivelineChart data={newData} value={50} />);

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_DATA',
          payload: { data: newData, value: 50 },
        }),
      );
    });

    it('does not send SET_DATA before CHART_READY', () => {
      render(<LivelineChart data={MOCK_DATA} value={43.1} />);

      const setDataCalls = mockPostMessage.mock.calls.filter((call) => {
        try {
          return JSON.parse(call[0] as string).type === 'SET_DATA';
        } catch {
          return false;
        }
      });

      expect(setDataCalls).toHaveLength(0);
    });

    it('sends SET_SERIES when series prop changes after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');
      makeReady(webView);
      mockPostMessage.mockClear();

      rerender(
        <LivelineChart data={MOCK_DATA} value={43.1} series={MOCK_SERIES} />,
      );

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_SERIES',
          payload: { series: MOCK_SERIES },
        }),
      );
    });

    it('sends SET_PROPS with loading/paused/emptyText when they change after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');
      makeReady(webView);
      mockPostMessage.mockClear();

      rerender(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          loading
          paused
          emptyText="No data"
        />,
      );

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_PROPS',
          payload: { loading: true, paused: true, emptyText: 'No data' },
        }),
      );
    });

    it('sends SET_PROPS with candles when candles prop changes after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');
      makeReady(webView);
      mockPostMessage.mockClear();

      rerender(
        <LivelineChart data={MOCK_DATA} value={43.1} candles={[MOCK_CANDLE]} />,
      );

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_PROPS',
          payload: { candles: [MOCK_CANDLE] },
        }),
      );
    });

    it('sends SET_PROPS with liveCandle when liveCandle prop changes after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');
      makeReady(webView);
      mockPostMessage.mockClear();

      rerender(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          liveCandle={MOCK_CANDLE}
        />,
      );

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_PROPS',
          payload: { liveCandle: MOCK_CANDLE },
        }),
      );
    });

    it('sends SET_PROPS with lineData and lineValue when lineData prop changes after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');
      makeReady(webView);
      mockPostMessage.mockClear();

      rerender(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          lineData={MOCK_DATA}
          lineValue={43.1}
        />,
      );

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_PROPS',
          payload: { lineData: MOCK_DATA, lineValue: 43.1 },
        }),
      );
    });

    it('sends SET_PROPS with hiddenSeriesIds when hiddenSeriesIds prop changes after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      const webView = getByTestId('liveline-chart-webview');
      makeReady(webView);
      mockPostMessage.mockClear();

      rerender(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          hiddenSeriesIds={['series-1']}
        />,
      );

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_PROPS',
          payload: { hiddenSeriesIds: ['series-1'] },
        }),
      );
    });
  });

  describe('htmlContent reload behaviour', () => {
    it('resets to loading state when structural props change', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} color="red" />,
      );
      const webView = getByTestId('liveline-chart-webview');

      // Bring chart to ready state
      fireMessage(webView, { type: 'CHART_READY', payload: {} });
      expect(queryByTestId('liveline-chart-loading')).not.toBeOnTheScreen();

      // Change a structural prop — triggers HTML rebuild and WebView reload
      rerender(<LivelineChart data={MOCK_DATA} value={43.1} color="blue" />);

      expect(getByTestId('liveline-chart-loading')).toBeOnTheScreen();
    });

    it('sends SET_DATA again after re-emitting CHART_READY on structural prop change', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} color="red" />,
      );
      const webView = getByTestId('liveline-chart-webview');
      fireMessage(webView, { type: 'CHART_READY', payload: {} });
      mockPostMessage.mockClear();

      // Structural prop change → html reload
      rerender(<LivelineChart data={MOCK_DATA} value={43.1} color="blue" />);

      // New WebView emits CHART_READY
      fireMessage(webView, { type: 'CHART_READY', payload: {} });

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_DATA',
          payload: { data: MOCK_DATA, value: 43.1 },
        }),
      );
    });
  });

  describe('ignores unknown or malformed WebView messages', () => {
    it('ignores messages with an unknown type', () => {
      const onChartReady = jest.fn();
      const onError = jest.fn();
      const { getByTestId } = render(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          onChartReady={onChartReady}
          onError={onError}
        />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'SOME_UNKNOWN_EVENT',
        payload: {},
      });

      expect(onChartReady).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('ignores messages that are not valid JSON', () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} onError={onError} />,
      );

      act(() => {
        (
          getByTestId('liveline-chart-webview').props.onMessage as (
            e: unknown,
          ) => void
        )({
          nativeEvent: { data: 'not-json' },
        });
      });

      expect(onError).not.toHaveBeenCalled();
    });
  });
});

// ---- parseWebViewMessage unit tests ----

describe('parseWebViewMessage', () => {
  it('returns null for null input', () => {
    expect(parseWebViewMessage(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseWebViewMessage('string')).toBeNull();
    expect(parseWebViewMessage(42)).toBeNull();
  });

  it('returns null when type field is missing', () => {
    expect(parseWebViewMessage({ payload: {} })).toBeNull();
  });

  it('returns null for an unrecognised message type', () => {
    expect(parseWebViewMessage({ type: 'UNKNOWN' })).toBeNull();
  });

  it('parses CHART_READY message', () => {
    const result = parseWebViewMessage({ type: 'CHART_READY', payload: {} });

    expect(result).toEqual({ type: 'CHART_READY', payload: {} });
  });

  it('parses ERROR message with provided message string', () => {
    const result = parseWebViewMessage({
      type: 'ERROR',
      payload: { message: 'something went wrong' },
    });

    expect(result).toEqual({
      type: 'ERROR',
      payload: { message: 'something went wrong' },
    });
  });

  it('returns "Unknown error" when ERROR payload has no message field', () => {
    const result = parseWebViewMessage({ type: 'ERROR', payload: {} });

    expect(result).toEqual({
      type: 'ERROR',
      payload: { message: 'Unknown error' },
    });
  });

  it('returns "Unknown error" when ERROR has no payload', () => {
    const result = parseWebViewMessage({ type: 'ERROR' });

    expect(result).toEqual({
      type: 'ERROR',
      payload: { message: 'Unknown error' },
    });
  });

  it('parses HOVER message with a valid point', () => {
    const point: HoverPoint = { time: 1000, value: 42, x: 10, y: 20 };
    const result = parseWebViewMessage({ type: 'HOVER', payload: point });

    expect(result).toEqual({ type: 'HOVER', payload: point });
  });

  it('returns null payload for HOVER when payload is null', () => {
    const result = parseWebViewMessage({ type: 'HOVER', payload: null });

    expect(result).toEqual({ type: 'HOVER', payload: null });
  });

  it('returns null payload for HOVER when payload is absent', () => {
    const result = parseWebViewMessage({ type: 'HOVER' });

    expect(result).toEqual({ type: 'HOVER', payload: null });
  });
});
