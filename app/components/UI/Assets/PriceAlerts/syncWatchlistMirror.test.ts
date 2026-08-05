import Logger from '../../../../util/Logger';
import { addWatchlistAlert, removeWatchlistAlert } from './api';
import { syncPriceAlertsWatchlistMirror } from './syncWatchlistMirror';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('./api', () => ({
  addWatchlistAlert: jest.fn(),
  removeWatchlistAlert: jest.fn(),
  assertOkResponse: jest.requireActual('./api').assertOkResponse,
}));

const mockedAdd = addWatchlistAlert as jest.MockedFunction<
  typeof addWatchlistAlert
>;
const mockedRemove = removeWatchlistAlert as jest.MockedFunction<
  typeof removeWatchlistAlert
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
  mockedAdd.mockResolvedValue(makeOkResponse(undefined, 201));
  mockedRemove.mockResolvedValue(makeOkResponse(undefined, 204));
});

describe('syncPriceAlertsWatchlistMirror', () => {
  it('POSTs newly added assets', async () => {
    await syncPriceAlertsWatchlistMirror([], [ETH, USDC]);

    expect(mockedAdd).toHaveBeenCalledTimes(2);
    expect(mockedAdd).toHaveBeenCalledWith(ETH);
    expect(mockedAdd).toHaveBeenCalledWith(USDC);
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it('DELETEs removed assets', async () => {
    await syncPriceAlertsWatchlistMirror([ETH, USDC], [ETH]);

    expect(mockedRemove).toHaveBeenCalledTimes(1);
    expect(mockedRemove).toHaveBeenCalledWith(USDC);
    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it('always mirrors every net membership change (API decides support)', async () => {
    await syncPriceAlertsWatchlistMirror([], [ETH, BSC_TOKEN]);

    expect(mockedAdd).toHaveBeenCalledTimes(2);
    expect(mockedAdd).toHaveBeenCalledWith(ETH);
    expect(mockedAdd).toHaveBeenCalledWith(BSC_TOKEN);
  });

  it('no-ops when membership is unchanged (reorder only)', async () => {
    await syncPriceAlertsWatchlistMirror([ETH, USDC], [USDC, ETH]);

    expect(mockedAdd).not.toHaveBeenCalled();
    expect(mockedRemove).not.toHaveBeenCalled();
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
});
