import React from 'react';
import { render, act } from '@testing-library/react-native';
import LivelineChart from '../LivelineChart';
import {
  parseWebViewMessage,
  type LivelinePoint,
  type CandlePoint,
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

const makeReady = (webView: { props: Record<string, unknown> }) => {
  fireMessage(webView, { type: 'CHART_READY' });
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

    it('shows the loading overlay before CHART_READY', () => {
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      expect(getByTestId('liveline-chart-loading')).toBeOnTheScreen();
    });

    it('hides the loading overlay after CHART_READY', () => {
      const { getByTestId, queryByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );

      makeReady(getByTestId('liveline-chart-webview'));

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

      makeReady(getByTestId('liveline-chart-webview'));

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

    it('calls onWindowChange when WINDOW_CHANGE message arrives', () => {
      const onWindowChange = jest.fn();
      const { getByTestId } = render(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          onWindowChange={onWindowChange}
        />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'WINDOW_CHANGE',
        payload: { secs: 60 },
      });

      expect(onWindowChange).toHaveBeenCalledWith(60);
    });

    it('calls onModeChange when MODE_CHANGE message arrives', () => {
      const onModeChange = jest.fn();
      const { getByTestId } = render(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          onModeChange={onModeChange}
        />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'MODE_CHANGE',
        payload: { mode: 'candle' },
      });

      expect(onModeChange).toHaveBeenCalledWith('candle');
    });

    it('calls onSeriesToggle when SERIES_TOGGLE message arrives', () => {
      const onSeriesToggle = jest.fn();
      const { getByTestId } = render(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          onSeriesToggle={onSeriesToggle}
        />,
      );

      fireMessage(getByTestId('liveline-chart-webview'), {
        type: 'SERIES_TOGGLE',
        payload: { id: 'series-1', visible: false },
      });

      expect(onSeriesToggle).toHaveBeenCalledWith('series-1', false);
    });
  });

  describe('error state', () => {
    it('renders the error container when ERROR arrives before CHART_READY', () => {
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
        )({ nativeEvent: { description: 'connection refused' } });
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
        )({ nativeEvent: { description: 'connection refused' } });
      });

      expect(onError).toHaveBeenCalledWith('connection refused');
    });
  });

  describe('SET_PROPS postMessage', () => {
    const getSetPropsPayload = () => {
      const call = mockPostMessage.mock.calls.find((c) =>
        (c[0] as string).includes('"SET_PROPS"'),
      );
      return call ? JSON.parse(call[0] as string).payload : undefined;
    };

    it('sends SET_PROPS with the chart props after CHART_READY', () => {
      const { getByTestId } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} loading />,
      );

      makeReady(getByTestId('liveline-chart-webview'));

      const payload = getSetPropsPayload();
      expect(payload.data).toEqual(MOCK_DATA);
      expect(payload.value).toBe(43.1);
      expect(payload.loading).toBe(true);
    });

    it('does not send SET_PROPS before CHART_READY', () => {
      render(<LivelineChart data={MOCK_DATA} value={43.1} />);

      expect(getSetPropsPayload()).toBeUndefined();
    });

    it('sends updated SET_PROPS when data prop changes after CHART_READY', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      makeReady(getByTestId('liveline-chart-webview'));
      mockPostMessage.mockClear();

      const newData: LivelinePoint[] = [{ time: 1700000060, value: 50 }];
      rerender(<LivelineChart data={newData} value={50} />);

      const payload = getSetPropsPayload();
      expect(payload.data).toEqual(newData);
      expect(payload.value).toBe(50);
    });

    it('includes candles in SET_PROPS when candles prop is provided', () => {
      const { getByTestId, rerender } = render(
        <LivelineChart data={MOCK_DATA} value={43.1} />,
      );
      makeReady(getByTestId('liveline-chart-webview'));
      mockPostMessage.mockClear();

      rerender(
        <LivelineChart data={MOCK_DATA} value={43.1} candles={[MOCK_CANDLE]} />,
      );

      expect(getSetPropsPayload().candles).toEqual([MOCK_CANDLE]);
    });

    it('does not include RN-only props in the payload', () => {
      const onChartReady = jest.fn();
      const onError = jest.fn();
      const { getByTestId } = render(
        <LivelineChart
          data={MOCK_DATA}
          value={43.1}
          height={400}
          onChartReady={onChartReady}
          onError={onError}
        />,
      );

      makeReady(getByTestId('liveline-chart-webview'));

      const payload = getSetPropsPayload();
      expect(payload.height).toBeUndefined();
      expect(payload.onChartReady).toBeUndefined();
      expect(payload.onError).toBeUndefined();
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
        )({ nativeEvent: { data: 'not-json' } });
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
    const result = parseWebViewMessage({ type: 'CHART_READY' });

    expect(result).toEqual({ type: 'CHART_READY' });
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

  it('parses HOVER message with a valid point', () => {
    const point: HoverPoint = { time: 1000, value: 42, x: 10, y: 20 };
    const result = parseWebViewMessage({ type: 'HOVER', payload: point });

    expect(result).toEqual({ type: 'HOVER', payload: point });
  });

  it('returns null payload for HOVER when payload is null', () => {
    const result = parseWebViewMessage({ type: 'HOVER', payload: null });

    expect(result).toEqual({ type: 'HOVER', payload: null });
  });

  it('parses WINDOW_CHANGE message', () => {
    const result = parseWebViewMessage({
      type: 'WINDOW_CHANGE',
      payload: { secs: 30 },
    });

    expect(result).toEqual({ type: 'WINDOW_CHANGE', payload: { secs: 30 } });
  });

  it('parses MODE_CHANGE message', () => {
    const result = parseWebViewMessage({
      type: 'MODE_CHANGE',
      payload: { mode: 'candle' },
    });

    expect(result).toEqual({
      type: 'MODE_CHANGE',
      payload: { mode: 'candle' },
    });
  });

  it('parses SERIES_TOGGLE message', () => {
    const result = parseWebViewMessage({
      type: 'SERIES_TOGGLE',
      payload: { id: 'series-1', visible: false },
    });

    expect(result).toEqual({
      type: 'SERIES_TOGGLE',
      payload: { id: 'series-1', visible: false },
    });
  });
});
