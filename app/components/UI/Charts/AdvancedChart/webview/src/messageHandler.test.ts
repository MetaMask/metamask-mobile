/* eslint-disable @metamask/design-tokens/color-no-hex */

import { setState, resetState, getState } from './state';

jest.mock('./bridge', () => ({
  sendToReactNative: jest.fn(),
  beginDeferredLayoutSettleAfterOhlcvReload: jest.fn(),
  abortDeferredLayoutSettleAndNotify: jest.fn(),
  queueTryCompleteLayoutSettleAfterData: jest.fn(),
}));

import { handleMessage, setInitChartRef } from './messageHandler';

const mockTheme = {
  backgroundColor: '#131416',
  borderColor: '#333',
  textColor: '#fff',
  successColor: '#0C9F76',
  errorColor: '#E06470',
  primaryColor: '#4A90D9',
};

beforeEach(() => {
  resetState();
  setInitChartRef(jest.fn());
});

describe('handleMessage', () => {
  it('queues non-SET_OHLCV_DATA messages when chart is not ready', () => {
    setState({
      isChartReady: false,
      pendingMessages: [],
      chartWidget: null,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });

    handleMessage({
      data: JSON.stringify({ type: 'ADD_INDICATOR', payload: { id: 'RSI' } }),
    });

    expect(getState().pendingMessages).toHaveLength(1);
    expect(getState().pendingMessages[0].type).toBe('ADD_INDICATOR');
  });

  it('processes SET_OHLCV_DATA even when not ready', () => {
    const initChart = jest.fn();
    setInitChartRef(initChart);
    setState({
      isChartReady: false,
      chartWidget: null,
      pendingMessages: [],
      ohlcvData: [],
      ohlcvGeneration: 0,
      ohlcvPagination: {
        nextCursor: null,
        hasMore: false,
        assetId: null,
        vsCurrency: null,
      },
      currentResolution: '5',
      CONFIG: { theme: mockTheme, libraryUrl: '' },
      __mmSuppressChartInteractUntil: 0,
      lineChartOhlcvEpoch: 0,
      visibleFromMs: null,
      visibleToMs: null,
    });

    handleMessage({
      data: JSON.stringify({
        type: 'SET_OHLCV_DATA',
        payload: {
          data: [
            {
              time: 1700000000000,
              open: 1,
              high: 2,
              low: 0.5,
              close: 1.5,
              volume: 100,
            },
          ],
        },
      }),
    });

    expect(getState().ohlcvData).toHaveLength(1);
    expect(initChart).toHaveBeenCalled();
  });

  it('handles JSON parse of string data', () => {
    setState({
      isChartReady: false,
      pendingMessages: [],
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });

    handleMessage({ data: '{"type":"SET_CHART_TYPE","payload":{"type":1}}' });

    expect(getState().pendingMessages).toHaveLength(1);
  });

  it('handles object data (already parsed)', () => {
    setState({
      isChartReady: false,
      pendingMessages: [],
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });

    handleMessage({
      data: { type: 'TOGGLE_VOLUME', payload: { visible: true } },
    });

    expect(getState().pendingMessages).toHaveLength(1);
  });
});
