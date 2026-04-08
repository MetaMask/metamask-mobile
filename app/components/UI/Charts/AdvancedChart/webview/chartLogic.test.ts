import chartLogicScript from './chartLogicString';

type WebViewWindow = Window &
  typeof globalThis & {
    ReactNativeWebView: { postMessage: jest.Mock };
    customDatafeed: {
      getBars: (
        symbolInfo: unknown,
        resolution: string,
        periodParams: {
          from: number;
          to: number;
          countBack: number;
          firstDataRequest: boolean;
        },
        onResult: jest.Mock,
        onError: jest.Mock,
      ) => void;
    };
    handleSetOHLCVData: (payload: unknown) => void;
    ohlcvData: { time: number }[];
  };

const getTestWindow = () => window as unknown as WebViewWindow;

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const loadChartLogic = () => {
  const win = getTestWindow();
  const globalDocument = global.document as
    | {
        readyState?: string;
        addEventListener?: jest.Mock;
        getElementById?: jest.Mock;
      }
    | undefined;
  if (!win.addEventListener) {
    win.addEventListener = jest.fn() as unknown as typeof win.addEventListener;
  }
  if (!globalDocument) {
    global.document = {
      readyState: 'loading',
      addEventListener: jest.fn(),
      getElementById: jest.fn(() => ({
        textContent: '',
        innerHTML: '',
        classList: { add: jest.fn() },
      })),
    } as Document;
  } else {
    globalDocument.readyState = 'loading';
    if (!globalDocument.addEventListener) {
      globalDocument.addEventListener = jest.fn();
    }
    globalDocument.getElementById = jest.fn(() => ({
      textContent: '',
      innerHTML: '',
      classList: { add: jest.fn() },
    }));
  }
  win.ReactNativeWebView = {
    postMessage: jest.fn(),
  };
  win.eval(chartLogicScript);
  return win;
};

describe('chartLogic older-history pagination', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('coalesces overlapping older-history getBars calls onto one fetch', async () => {
    const win = loadChartLogic();
    let resolveFetch: ((value: unknown) => void) | undefined;

    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    ) as jest.Mock;

    win.handleSetOHLCVData({
      data: [
        {
          time: 1000,
          open: 10,
          high: 10,
          low: 10,
          close: 10,
          volume: 10,
        },
      ],
      pagination: {
        nextCursor: 'cursor-1',
        hasMore: true,
        assetId: 'eip155:1/slip44:60',
        vsCurrency: 'usd',
      },
    });

    const onResultA = jest.fn();
    const onResultB = jest.fn();
    const onErrorA = jest.fn();
    const onErrorB = jest.fn();

    win.customDatafeed.getBars(
      {},
      '1',
      { from: 2, to: 3, countBack: 0, firstDataRequest: false },
      onResultA,
      onErrorA,
    );
    win.customDatafeed.getBars(
      {},
      '1',
      { from: 2, to: 3, countBack: 0, firstDataRequest: false },
      onResultB,
      onErrorB,
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              timestamp: 500,
              open: 1,
              high: 2,
              low: 1,
              close: 2,
              volume: 100,
            },
          ],
          hasNext: false,
          nextCursor: null,
        }),
    });

    await flushPromises();

    expect(onResultA).toHaveBeenCalledWith(
      [
        {
          time: 500,
          open: 1,
          high: 2,
          low: 1,
          close: 2,
          volume: 100,
        },
      ],
      { noData: false },
    );
    expect(onResultB).toHaveBeenCalledWith(
      [
        {
          time: 500,
          open: 1,
          high: 2,
          low: 1,
          close: 2,
          volume: 100,
        },
      ],
      { noData: false },
    );
    expect(onErrorA).not.toHaveBeenCalled();
    expect(onErrorB).not.toHaveBeenCalled();
    expect(win.ohlcvData).toHaveLength(2);
  });

  it('reports older-history fetch failures through onError', async () => {
    const win = loadChartLogic();

    global.fetch = jest.fn(() =>
      Promise.reject(new Error('network down')),
    ) as jest.Mock;

    win.handleSetOHLCVData({
      data: [
        {
          time: 1000,
          open: 10,
          high: 10,
          low: 10,
          close: 10,
          volume: 10,
        },
      ],
      pagination: {
        nextCursor: 'cursor-1',
        hasMore: true,
        assetId: 'eip155:1/slip44:60',
        vsCurrency: 'usd',
      },
    });

    const onResult = jest.fn();
    const onError = jest.fn();

    win.customDatafeed.getBars(
      {},
      '1',
      { from: 2, to: 3, countBack: 0, firstDataRequest: false },
      onResult,
      onError,
    );

    await flushPromises();

    expect(onResult).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('network down');
  });

  it('clears pending older-history state when a new OHLCV series arrives', async () => {
    const win = loadChartLogic();
    let resolveFirstFetch: ((value: unknown) => void) | undefined;

    global.fetch = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstFetch = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                timestamp: 1500,
                open: 3,
                high: 4,
                low: 2,
                close: 4,
                volume: 50,
              },
            ],
            hasNext: false,
            nextCursor: null,
          }),
      });

    win.handleSetOHLCVData({
      data: [
        {
          time: 2000,
          open: 20,
          high: 20,
          low: 20,
          close: 20,
          volume: 20,
        },
      ],
      pagination: {
        nextCursor: 'cursor-old',
        hasMore: true,
        assetId: 'eip155:1/slip44:60',
        vsCurrency: 'usd',
      },
    });

    win.customDatafeed.getBars(
      {},
      '1',
      { from: 3, to: 4, countBack: 0, firstDataRequest: false },
      jest.fn(),
      jest.fn(),
    );

    win.handleSetOHLCVData({
      data: [
        {
          time: 3000,
          open: 30,
          high: 30,
          low: 30,
          close: 30,
          volume: 30,
        },
      ],
      pagination: {
        nextCursor: 'cursor-new',
        hasMore: true,
        assetId: 'eip155:1/slip44:60',
        vsCurrency: 'usd',
      },
    });

    const onResult = jest.fn();
    const onError = jest.fn();
    win.customDatafeed.getBars(
      {},
      '1',
      { from: 4, to: 5, countBack: 0, firstDataRequest: false },
      onResult,
      onError,
    );

    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(2);

    resolveFirstFetch?.({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              timestamp: 1000,
              open: 1,
              high: 1,
              low: 1,
              close: 1,
              volume: 10,
            },
          ],
          hasNext: false,
          nextCursor: null,
        }),
    });

    await flushPromises();

    expect(onResult).toHaveBeenCalledWith(
      [
        {
          time: 1500,
          open: 3,
          high: 4,
          low: 2,
          close: 4,
          volume: 50,
        },
      ],
      { noData: false },
    );
    expect(onError).not.toHaveBeenCalled();
  });
});
