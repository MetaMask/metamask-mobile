/* eslint-disable @metamask/design-tokens/color-no-hex */

import { setState, resetState, getState } from './state';

jest.mock('./bridge', () => ({
  sendToReactNative: jest.fn(),
  beginDeferredLayoutSettleAfterOhlcvReload: jest.fn(),
  abortDeferredLayoutSettleAndNotify: jest.fn(),
  queueTryCompleteLayoutSettleAfterData: jest.fn(),
}));

import { handleSetOHLCVData, handleRealtimeUpdate } from './ohlcvData';
import type { SetOHLCVDataPayload, RealtimeUpdatePayload } from './types';

const mockTheme = {
  backgroundColor: '#131416',
  borderColor: '#333',
  textColor: '#fff',
  successColor: '#0C9F76',
  errorColor: '#E06470',
  primaryColor: '#4A90D9',
};

function makeBaseState() {
  return {
    chartWidget: null,
    isChartReady: false,
    ohlcvData: [],
    ohlcvGeneration: 0,
    ohlcvPagination: {
      nextCursor: null,
      hasMore: false,
      assetId: null,
      vsCurrency: null,
    },
    currentResolution: '5',
    currentChartType: 2,
    pendingMessages: [],
    CONFIG: { theme: mockTheme, libraryUrl: '' },
    __mmSuppressChartInteractUntil: 0,
    lineChartOhlcvEpoch: 0,
    visibleFromMs: null as number | null,
    visibleToMs: null as number | null,
    lineEndDotShapeId: null,
    lineLastPriceShapeId: null,
    lastPriceShapeId: null,
    realtimeCallbacks: {},
  };
}

beforeEach(() => resetState());

describe('handleSetOHLCVData', () => {
  it('does nothing for empty payload', () => {
    setState(makeBaseState());
    handleSetOHLCVData({} as SetOHLCVDataPayload, jest.fn());
    expect(getState().ohlcvData).toHaveLength(0);
  });

  it('sets ohlcvData from payload', () => {
    const initChart = jest.fn();
    setState(makeBaseState());

    handleSetOHLCVData(
      {
        data: [
          {
            time: 1700000000000,
            open: 1,
            high: 2,
            low: 0.5,
            close: 1.5,
            volume: 100,
          },
          {
            time: 1700000300000,
            open: 1.5,
            high: 2.5,
            low: 1.0,
            close: 2.0,
            volume: 200,
          },
        ],
      },
      initChart,
    );

    expect(getState().ohlcvData).toHaveLength(2);
    expect(getState().ohlcvGeneration).toBe(1);
    expect(initChart).toHaveBeenCalled();
  });

  it('sets pagination from payload', () => {
    const initChart = jest.fn();
    setState(makeBaseState());

    handleSetOHLCVData(
      {
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
        pagination: {
          nextCursor: 'abc',
          hasMore: true,
          assetId: 'btc',
          vsCurrency: 'usd',
        },
      },
      initChart,
    );

    expect(getState().ohlcvPagination.nextCursor).toBe('abc');
    expect(getState().ohlcvPagination.hasMore).toBe(true);
  });

  it('defaults pagination when not in payload', () => {
    const initChart = jest.fn();
    setState(makeBaseState());

    handleSetOHLCVData(
      {
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
      initChart,
    );

    expect(getState().ohlcvPagination.nextCursor).toBeNull();
    expect(getState().ohlcvPagination.hasMore).toBe(false);
  });
});

describe('handleRealtimeUpdate', () => {
  it('does nothing for empty payload', () => {
    setState(makeBaseState());
    handleRealtimeUpdate({} as RealtimeUpdatePayload);
    expect(getState().ohlcvData).toHaveLength(0);
  });

  it('appends a new bar', () => {
    const base = makeBaseState();
    base.ohlcvData = [
      {
        time: 1700000000000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      },
    ];
    base.currentChartType = 1;
    setState(base);

    handleRealtimeUpdate({
      bar: {
        time: 1700000300000,
        open: 1.5,
        high: 2.5,
        low: 1.0,
        close: 2.0,
        volume: 200,
      },
    });

    expect(getState().ohlcvData).toHaveLength(2);
  });

  it('updates the last bar if same time', () => {
    const base = makeBaseState();
    base.ohlcvData = [
      {
        time: 1700000000000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      },
    ];
    base.currentChartType = 1;
    setState(base);

    handleRealtimeUpdate({
      bar: {
        time: 1700000000000,
        open: 1,
        high: 3,
        low: 0.5,
        close: 2.5,
        volume: 150,
      },
    });

    expect(getState().ohlcvData).toHaveLength(1);
    expect(getState().ohlcvData[0].close).toBe(2.5);
    expect(getState().ohlcvData[0].high).toBe(3);
  });

  it('fires realtime callbacks', () => {
    const cb = jest.fn();
    const base = makeBaseState();
    base.ohlcvData = [
      {
        time: 1700000000000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      },
    ];
    base.realtimeCallbacks = { guid1: cb };
    base.currentChartType = 1;
    setState(base);

    handleRealtimeUpdate({
      bar: {
        time: 1700000300000,
        open: 1.5,
        high: 2.5,
        low: 1.0,
        close: 2.0,
        volume: 200,
      },
    });

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        time: 1700000300000,
        close: 2.0,
      }),
    );
  });
});
