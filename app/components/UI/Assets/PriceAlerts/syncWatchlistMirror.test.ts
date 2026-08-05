import Logger from '../../../../util/Logger';
import {
  addWatchlistAlert,
  fetchSupportedChains,
  removeWatchlistAlert,
} from './api';
import {
  resetSupportedChainsCacheForTests,
  syncPriceAlertsWatchlistMirror,
} from './syncWatchlistMirror';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('./api', () => ({
  addWatchlistAlert: jest.fn(),
  removeWatchlistAlert: jest.fn(),
  fetchSupportedChains: jest.fn(),
  assertOkResponse: jest.requireActual('./api').assertOkResponse,
}));

const mockedAdd = addWatchlistAlert as jest.MockedFunction<
  typeof addWatchlistAlert
>;
const mockedRemove = removeWatchlistAlert as jest.MockedFunction<
  typeof removeWatchlistAlert
>;
const mockedFetchSupportedChains = fetchSupportedChains as jest.MockedFunction<
  typeof fetchSupportedChains
>;

const ETH = 'eip155:1/slip44:60';
const USDC = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const BSC_TOKEN = 'eip155:56/slip44:714';

const makeOkResponse = (body?: unknown, status = 200) =>
  ({
    ok: true,
    status,
    json: jest.fn().mockResolvedValue(body ?? []),
    text: jest.fn().mockResolvedValue(''),
  }) as unknown as Response;

const makeErrorResponse = (status: number, bodyText = 'error') =>
  ({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(bodyText),
  }) as unknown as Response;

beforeEach(() => {
  jest.clearAllMocks();
  resetSupportedChainsCacheForTests();
  mockedFetchSupportedChains.mockResolvedValue(
    makeOkResponse(['eip155:1', 'eip155:137']),
  );
  mockedAdd.mockResolvedValue(makeOkResponse(undefined, 201));
  mockedRemove.mockResolvedValue(makeOkResponse(undefined, 204));
});

describe('syncPriceAlertsWatchlistMirror', () => {
  it('POSTs newly added assets on supported chains', async () => {
    await syncPriceAlertsWatchlistMirror([], [ETH, USDC]);

    expect(mockedAdd).toHaveBeenCalledTimes(2);
    expect(mockedAdd).toHaveBeenCalledWith(ETH);
    expect(mockedAdd).toHaveBeenCalledWith(USDC);
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it('DELETEs removed assets on supported chains', async () => {
    await syncPriceAlertsWatchlistMirror([ETH, USDC], [ETH]);

    expect(mockedRemove).toHaveBeenCalledTimes(1);
    expect(mockedRemove).toHaveBeenCalledWith(USDC);
    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it('skips assets on unsupported chains', async () => {
    await syncPriceAlertsWatchlistMirror([], [ETH, BSC_TOKEN]);

    expect(mockedAdd).toHaveBeenCalledTimes(1);
    expect(mockedAdd).toHaveBeenCalledWith(ETH);
    expect(mockedAdd).not.toHaveBeenCalledWith(BSC_TOKEN);
  });

  it('no-ops when membership is unchanged (reorder only)', async () => {
    await syncPriceAlertsWatchlistMirror([ETH, USDC], [USDC, ETH]);

    expect(mockedFetchSupportedChains).not.toHaveBeenCalled();
    expect(mockedAdd).not.toHaveBeenCalled();
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it('skips all mirrors when supported-chains cannot be loaded', async () => {
    mockedFetchSupportedChains.mockResolvedValue(makeErrorResponse(500));

    await syncPriceAlertsWatchlistMirror([], [ETH]);

    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it('soft-fails POST errors without throwing', async () => {
    mockedAdd.mockResolvedValue(makeErrorResponse(422, 'unsupported asset'));

    await expect(
      syncPriceAlertsWatchlistMirror([], [ETH]),
    ).resolves.toBeUndefined();

    expect(Logger.error).toHaveBeenCalled();
  });

  it('soft-fails DELETE errors without throwing', async () => {
    mockedRemove.mockRejectedValue(new Error('network down'));

    await expect(
      syncPriceAlertsWatchlistMirror([ETH], []),
    ).resolves.toBeUndefined();

    expect(Logger.error).toHaveBeenCalled();
  });

  it('caches supported chains across calls', async () => {
    await syncPriceAlertsWatchlistMirror([], [ETH]);
    await syncPriceAlertsWatchlistMirror([ETH], [ETH, USDC]);

    expect(mockedFetchSupportedChains).toHaveBeenCalledTimes(1);
    expect(mockedAdd).toHaveBeenCalledTimes(2);
  });
});
