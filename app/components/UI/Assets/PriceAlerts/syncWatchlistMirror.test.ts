import Logger from '../../../../util/Logger';
import { addWatchlistAlerts, removeWatchlistAlerts } from './api';
import { syncPriceAlertsWatchlistMirror } from './syncWatchlistMirror';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('./api', () => ({
  addWatchlistAlerts: jest.fn(),
  removeWatchlistAlerts: jest.fn(),
  assertOkResponse: jest.requireActual('./api').assertOkResponse,
}));

const mockedAdd = addWatchlistAlerts as jest.MockedFunction<
  typeof addWatchlistAlerts
>;
const mockedRemove = removeWatchlistAlerts as jest.MockedFunction<
  typeof removeWatchlistAlerts
>;

const ETH = 'eip155:1/slip44:60';
const USDC = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const APE = 'eip155:33139/slip44:60';
const SOLANA_MINT =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const makeOkResponse = (body?: unknown, status = 200) =>
  ({
    ok: true,
    status,
    json: jest
      .fn()
      .mockResolvedValue(
        body ?? { processedAssetIds: [], unprocessedAssetIds: [] },
      ),
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
  mockedAdd.mockResolvedValue(
    makeOkResponse({
      processedAssetIds: [ETH],
      unprocessedAssetIds: [],
    }),
  );
  mockedRemove.mockResolvedValue(
    makeOkResponse({
      processedAssetIds: [ETH],
      unprocessedAssetIds: [],
    }),
  );
});

describe('syncPriceAlertsWatchlistMirror', () => {
  it('POSTs newly added assets as a single assetIds batch', async () => {
    await syncPriceAlertsWatchlistMirror([], [ETH, USDC]);

    expect(mockedAdd).toHaveBeenCalledTimes(1);
    expect(mockedAdd).toHaveBeenCalledWith([ETH, USDC]);
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it('DELETEs removed assets as a single assetIds batch', async () => {
    await syncPriceAlertsWatchlistMirror([ETH, USDC], [ETH]);

    expect(mockedRemove).toHaveBeenCalledTimes(1);
    expect(mockedRemove).toHaveBeenCalledWith([USDC]);
    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it('logs unprocessedAssetIds on 200 without throwing', async () => {
    mockedAdd.mockResolvedValue(
      makeOkResponse({
        processedAssetIds: [ETH],
        unprocessedAssetIds: [APE],
      }),
    );

    await expect(
      syncPriceAlertsWatchlistMirror([], [ETH, APE]),
    ).resolves.toBeUndefined();

    expect(mockedAdd).toHaveBeenCalledWith([ETH, APE]);
    expect(Logger.log).toHaveBeenCalledWith(
      'Price Alerts watchlist partial processing',
      expect.objectContaining({
        action: 'POST',
        unprocessedAssetIds: [APE],
        processedAssetIds: [ETH],
      }),
    );
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('preserves Solana mint casing when mirroring adds', async () => {
    mockedAdd.mockResolvedValue(
      makeOkResponse({
        processedAssetIds: [SOLANA_MINT],
        unprocessedAssetIds: [],
      }),
    );

    await syncPriceAlertsWatchlistMirror([], [SOLANA_MINT]);

    expect(mockedAdd).toHaveBeenCalledWith([SOLANA_MINT]);
  });

  it('no-ops when membership is unchanged (reorder only)', async () => {
    await syncPriceAlertsWatchlistMirror([ETH, USDC], [USDC, ETH]);

    expect(mockedAdd).not.toHaveBeenCalled();
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it.each([400, 401, 500])(
    'soft-fails POST HTTP %s without throwing',
    async (status) => {
      mockedAdd.mockResolvedValue(makeErrorResponse(status, 'failed'));

      await expect(
        syncPriceAlertsWatchlistMirror([], [ETH]),
      ).resolves.toBeUndefined();

      expect(Logger.error).toHaveBeenCalled();
    },
  );

  it('soft-fails DELETE network errors without throwing', async () => {
    mockedRemove.mockRejectedValue(new Error('network down'));

    await expect(
      syncPriceAlertsWatchlistMirror([ETH], []),
    ).resolves.toBeUndefined();

    expect(Logger.error).toHaveBeenCalled();
  });
});
