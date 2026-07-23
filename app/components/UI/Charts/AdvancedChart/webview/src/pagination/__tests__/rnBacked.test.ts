/**
 * @jest-environment jsdom
 */
import {
  requestOlderBarsFromRN,
  handleFetchOlderBarsResponse,
  resolveAllPendingOlderBarsNoData,
  __resetRnBackedPaginationForTests,
} from '../rnBacked';
import {
  __resetStateForTests,
  bumpOhlcvGeneration,
  getOhlcvData,
  setOhlcvData,
} from '../../core/state';
import type { GetBarsCallback, TVResolution } from '../../core/types';

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

const installRNBridge = (): MockBridge => {
  const bridge: MockBridge = { postMessage: jest.fn() };
  (
    window as unknown as { ReactNativeWebView?: MockBridge }
  ).ReactNativeWebView = bridge;
  return bridge;
};

const makeOnResult = (): GetBarsCallback & jest.Mock =>
  jest.fn() as GetBarsCallback & jest.Mock;

describe('pagination/rnBacked', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetRnBackedPaginationForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  describe('requestOlderBarsFromRN', () => {
    it('posts FETCH_OLDER_BARS_REQUEST to RN with monotonic requestId', () => {
      const bridge = installRNBridge();
      setOhlcvData([{ time: 100_000, open: 1, high: 1, low: 1, close: 1 }]);
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 50,
        toSec: 100,
        countBack: 10,
        onResult,
      });

      expect(bridge.postMessage).toHaveBeenCalledTimes(1);
      const msg = JSON.parse(bridge.postMessage.mock.calls[0][0]);
      expect(msg.type).toBe('FETCH_OLDER_BARS_REQUEST');
      expect(msg.payload.requestId).toContain('obr-0-1');
      expect(msg.payload.resolution).toBe('60');
      expect(msg.payload.fromSec).toBe(50);
      expect(msg.payload.toSec).toBe(100);
      expect(msg.payload.countBack).toBe(10);
      expect(msg.payload.oldestLoadedTimeMs).toBe(100_000);
    });

    it('increments requestSeq across calls', () => {
      const bridge = installRNBridge();
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult,
      });
      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult,
      });

      const msg1 = JSON.parse(bridge.postMessage.mock.calls[0][0]);
      const msg2 = JSON.parse(bridge.postMessage.mock.calls[1][0]);
      expect(msg1.payload.requestId).toContain('-1');
      expect(msg2.payload.requestId).toContain('-2');
    });

    it('omits countBack when not provided', () => {
      const bridge = installRNBridge();
      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult: makeOnResult(),
      });

      const msg = JSON.parse(bridge.postMessage.mock.calls[0][0]);
      expect(msg.payload.countBack).toBeUndefined();
    });
  });

  describe('handleFetchOlderBarsResponse', () => {
    it('resolves the pending callback with older bars and prepends to state', () => {
      installRNBridge();
      setOhlcvData([{ time: 200_000, open: 1, high: 1, low: 1, close: 1 }]);
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 200,
        onResult,
      });

      const msg = JSON.parse(
        (window as unknown as { ReactNativeWebView: MockBridge })
          .ReactNativeWebView.postMessage.mock.calls[0][0],
      );
      const requestId = msg.payload.requestId;

      handleFetchOlderBarsResponse({
        requestId,
        seriesGeneration: 0,
        bars: [
          { time: 50_000, open: 2, high: 2, low: 2, close: 2, volume: 10 },
          { time: 100_000, open: 3, high: 3, low: 3, close: 3, volume: 20 },
        ],
      });

      expect(onResult).toHaveBeenCalledTimes(1);
      expect(onResult.mock.calls[0][0]).toHaveLength(2);
      expect(onResult.mock.calls[0][1]).toEqual({ noData: false });
      expect(getOhlcvData()).toHaveLength(3);
      expect(getOhlcvData()[0].time).toBe(50_000);
    });

    it('deduplicates bars that already exist in state', () => {
      installRNBridge();
      setOhlcvData([
        { time: 100_000, open: 1, high: 1, low: 1, close: 1 },
        { time: 200_000, open: 1, high: 1, low: 1, close: 1 },
      ]);
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 200,
        onResult,
      });

      const msg = JSON.parse(
        (window as unknown as { ReactNativeWebView: MockBridge })
          .ReactNativeWebView.postMessage.mock.calls[0][0],
      );

      handleFetchOlderBarsResponse({
        requestId: msg.payload.requestId,
        seriesGeneration: 0,
        bars: [
          { time: 50_000, open: 2, high: 2, low: 2, close: 2, volume: 10 },
          { time: 100_000, open: 9, high: 9, low: 9, close: 9, volume: 99 },
        ],
      });

      expect(onResult.mock.calls[0][0]).toHaveLength(1);
      expect(onResult.mock.calls[0][0][0].time).toBe(50_000);
    });

    it('drops bars not strictly older than oldestAtDefer', () => {
      installRNBridge();
      setOhlcvData([{ time: 100_000, open: 1, high: 1, low: 1, close: 1 }]);
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 200,
        onResult,
      });

      const msg = JSON.parse(
        (window as unknown as { ReactNativeWebView: MockBridge })
          .ReactNativeWebView.postMessage.mock.calls[0][0],
      );

      handleFetchOlderBarsResponse({
        requestId: msg.payload.requestId,
        seriesGeneration: 0,
        bars: [
          { time: 150_000, open: 2, high: 2, low: 2, close: 2, volume: 10 },
        ],
      });

      expect(onResult.mock.calls[0][0]).toHaveLength(0);
      expect(onResult.mock.calls[0][1]).toEqual({ noData: true });
    });

    it('resolves noData when generation has changed', () => {
      installRNBridge();
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult,
      });

      const msg = JSON.parse(
        (window as unknown as { ReactNativeWebView: MockBridge })
          .ReactNativeWebView.postMessage.mock.calls[0][0],
      );

      bumpOhlcvGeneration();

      handleFetchOlderBarsResponse({
        requestId: msg.payload.requestId,
        seriesGeneration: 0,
        bars: [],
      });

      expect(onResult).toHaveBeenCalledWith([], { noData: true });
    });

    it('resolves noData when payload has error flag', () => {
      installRNBridge();
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult,
      });

      const msg = JSON.parse(
        (window as unknown as { ReactNativeWebView: MockBridge })
          .ReactNativeWebView.postMessage.mock.calls[0][0],
      );

      handleFetchOlderBarsResponse({
        requestId: msg.payload.requestId,
        seriesGeneration: 0,
        bars: [],
        error: 'something broke',
      });

      expect(onResult).toHaveBeenCalledWith([], { noData: true });
    });

    it('resolves noData when payload has noData flag', () => {
      installRNBridge();
      const onResult = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult,
      });

      const msg = JSON.parse(
        (window as unknown as { ReactNativeWebView: MockBridge })
          .ReactNativeWebView.postMessage.mock.calls[0][0],
      );

      handleFetchOlderBarsResponse({
        requestId: msg.payload.requestId,
        seriesGeneration: 0,
        bars: [],
        noData: true,
      });

      expect(onResult).toHaveBeenCalledWith([], { noData: true });
    });

    it('ignores unknown requestId', () => {
      handleFetchOlderBarsResponse({
        requestId: 'unknown-id',
        seriesGeneration: 0,
        bars: [],
      });
      // No error, no callback — silent ignore
    });

    it('ignores null/invalid payload', () => {
      handleFetchOlderBarsResponse(
        null as unknown as import('../../messages/contract').FetchOlderBarsResponsePayload,
      );
      handleFetchOlderBarsResponse({
        requestId: 123,
      } as unknown as import('../../messages/contract').FetchOlderBarsResponsePayload);
      // No error thrown
    });
  });

  describe('resolveAllPendingOlderBarsNoData', () => {
    it('resolves all pending callbacks with noData and clears the map', () => {
      installRNBridge();
      const onResult1 = makeOnResult();
      const onResult2 = makeOnResult();

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult: onResult1,
      });
      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 200,
        onResult: onResult2,
      });

      resolveAllPendingOlderBarsNoData();

      expect(onResult1).toHaveBeenCalledWith([], { noData: true });
      expect(onResult2).toHaveBeenCalledWith([], { noData: true });
    });

    it('reports errors from onResult callbacks to RN', () => {
      const bridge = installRNBridge();
      const badResult = jest.fn(() => {
        throw new Error('callback fail');
      }) as unknown as GetBarsCallback;

      requestOlderBarsFromRN({
        resolution: '60' as TVResolution,
        fromSec: 0,
        toSec: 100,
        onResult: badResult,
      });

      resolveAllPendingOlderBarsNoData();

      expect(bridge.postMessage).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"'),
      );
    });
  });
});
