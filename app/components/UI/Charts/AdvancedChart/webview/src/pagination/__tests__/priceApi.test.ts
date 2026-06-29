/**
 * @jest-environment jsdom
 */
import { fetchOlderBarsFromPriceApi, OHLCV_BASE_URL } from '../priceApi';
import {
  __resetStateForTests,
  bumpOhlcvGeneration,
  getOhlcvData,
  setOhlcvPagination,
} from '../../core/state';

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

const mockFetchOk = (body: unknown): jest.Mock =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);

describe('pagination/priceApi', () => {
  beforeEach(() => {
    __resetStateForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('returns noData when there is no cursor', async () => {
    const result = await fetchOlderBarsFromPriceApi({ oldestAtDefer: 100 });
    expect(result).toEqual({ olderBars: [], noData: true });
  });

  it('returns noData when hasMore is false', async () => {
    setOhlcvPagination({
      nextCursor: 'abc',
      hasMore: false,
      assetId: 'eip155:1/slip44:60',
      vsCurrency: 'usd',
    });
    const result = await fetchOlderBarsFromPriceApi({ oldestAtDefer: 100 });
    expect(result).toEqual({ olderBars: [], noData: true });
  });

  it('fetches older bars via the Price API and merges them into state', async () => {
    setOhlcvPagination({
      nextCursor: 'abc=',
      hasMore: true,
      assetId: 'eip155:1/slip44:60',
      vsCurrency: 'usd',
    });
    (globalThis as { fetch?: typeof fetch }).fetch = mockFetchOk({
      data: [
        { timestamp: 50, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
        { timestamp: 80, open: 2, high: 3, low: 1.5, close: 2.5, volume: 200 },
      ],
      nextCursor: 'def=',
      hasNext: true,
    }) as unknown as typeof fetch;

    const result = await fetchOlderBarsFromPriceApi({ oldestAtDefer: 100 });

    expect((globalThis as { fetch?: jest.Mock }).fetch).toHaveBeenCalledWith(
      `${OHLCV_BASE_URL}/eip155:1/slip44:60?nextCursor=abc%3D&vsCurrency=usd`,
    );
    expect(result.olderBars).toHaveLength(2);
    expect(result.noData).toBe(false);
    expect(getOhlcvData()).toHaveLength(2);
  });

  it('drops the response when generation changes mid-flight', async () => {
    setOhlcvPagination({
      nextCursor: 'abc',
      hasMore: true,
      assetId: 'a',
      vsCurrency: 'usd',
    });
    (globalThis as { fetch?: typeof fetch }).fetch = jest
      .fn()
      .mockImplementation(() => {
        bumpOhlcvGeneration();
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ data: [], nextCursor: null, hasNext: false }),
        } as Response);
      }) as unknown as typeof fetch;

    const result = await fetchOlderBarsFromPriceApi({ oldestAtDefer: 100 });
    expect(result).toEqual({ olderBars: [], noData: true });
  });

  it('reports network failures to RN and returns noData', async () => {
    const bridge = installRNBridge();
    setOhlcvPagination({
      nextCursor: 'abc',
      hasMore: true,
      assetId: 'a',
      vsCurrency: null,
    });
    (globalThis as { fetch?: typeof fetch }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    const result = await fetchOlderBarsFromPriceApi({ oldestAtDefer: 100 });
    expect(result).toEqual({ olderBars: [], noData: true });
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"offline"'),
    );
  });

  it('only returns bars strictly older than oldestAtDefer', async () => {
    setOhlcvPagination({
      nextCursor: 'abc',
      hasMore: true,
      assetId: 'a',
      vsCurrency: 'usd',
    });
    (globalThis as { fetch?: typeof fetch }).fetch = mockFetchOk({
      data: [
        { timestamp: 50, open: 1, high: 1, low: 1, close: 1 },
        { timestamp: 150, open: 1, high: 1, low: 1, close: 1 },
      ],
      nextCursor: null,
      hasNext: false,
    }) as unknown as typeof fetch;

    const result = await fetchOlderBarsFromPriceApi({ oldestAtDefer: 100 });
    expect(result.olderBars).toHaveLength(1);
    expect(result.olderBars[0].time).toBe(50);
  });
});
