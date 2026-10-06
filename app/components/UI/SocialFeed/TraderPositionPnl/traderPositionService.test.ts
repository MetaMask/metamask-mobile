import {
  getTraderPosition,
  TraderPositionHttpError,
  TraderPositionMalformedError,
} from './traderPositionService';

const mockCall = jest.fn();
const mockFetch = jest.fn();

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    SOCIAL_API_URL: 'https://social.test',
  },
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      _brand: 'rootMessenger',
      call(this: unknown, ...args: unknown[]) {
        if (!this || (this as { _brand?: string })._brand !== 'rootMessenger') {
          throw new TypeError("Cannot read property 'getAction' of undefined");
        }
        return mockCall(...args);
      },
    },
  },
}));

const positionBody = {
  positionId: 'pos-1',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'ethereum',
  isOpen: true,
  positionAmount: 90.0037,
  costBasis: 87999.999999,
  currentValueUSD: 374380.3695,
  realizedPnl: 123092.8501,
  pnlValueUsd: 409473.2196,
  pnlPercent: 12.5,
  boughtUsd: 200000,
  soldUsd: 0,
  perpPositionType: null,
  perpLeverage: null,
  positionAmountWithLeverage: null,
  costBasisWithLeverage: null,
  marginUsd: null,
  trades: [{ timestamp: 1_700_000_000 }],
  lastTradeAt: 1_700_000_100,
};

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('getTraderPosition', () => {
  beforeEach(() => {
    mockCall.mockReset();
    mockCall.mockResolvedValue('test-token');
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('returns the position from a 200 body', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, positionBody));
    const controller = new AbortController();

    const result = await getTraderPosition('pos-1', controller.signal);

    expect(mockCall).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://social.test/api/v1/traders/position/pos-1',
      {
        headers: { Authorization: 'Bearer test-token' },
        signal: controller.signal,
      },
    );
    expect(result.positionId).toBe('pos-1');
    expect(result.costBasis).toBe(87999.999999);
    expect(result.currentValueUSD).toBe(374380.3695);
    expect(result.trades).toEqual([{ timestamp: 1_700_000_000 }]);
  });

  it('throws a 401 error when the position request is unauthorized', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { message: 'unauthorized' }));

    await expect(getTraderPosition('pos-1')).rejects.toBeInstanceOf(
      TraderPositionHttpError,
    );
    await expect(getTraderPosition('pos-1')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('throws a 404 error when the position does not exist', async () => {
    mockFetch.mockResolvedValue(jsonResponse(404, { message: 'missing' }));

    await expect(getTraderPosition('pos-1')).rejects.toBeInstanceOf(
      TraderPositionHttpError,
    );
    await expect(getTraderPosition('pos-1')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('throws when a 200 body is missing required position fields', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { positionId: 'pos-1' }));

    await expect(getTraderPosition('pos-1')).rejects.toBeInstanceOf(
      TraderPositionMalformedError,
    );
  });

  it('throws a typed error for a non-401 non-404 failure', async () => {
    mockFetch.mockResolvedValue(jsonResponse(503, { message: 'unavailable' }));

    await expect(getTraderPosition('pos-1')).rejects.toMatchObject({
      name: 'TraderPositionHttpError',
      status: 503,
    });
  });

  it('rethrows an aborted request', async () => {
    const controller = new AbortController();
    controller.abort();
    mockFetch.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(
      getTraderPosition('pos-1', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
