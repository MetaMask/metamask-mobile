import AppConstants from '../../../../core/AppConstants';
import {
  getTraderPosition,
  toTraderPosition,
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

  it('throws when the 200 body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);

    await expect(getTraderPosition('pos-1')).rejects.toBeInstanceOf(
      TraderPositionMalformedError,
    );
  });

  it('encodes the position id and drops a trailing slash from the host', async () => {
    const constants = AppConstants as { SOCIAL_API_URL: string };
    const originalHost = constants.SOCIAL_API_URL;
    constants.SOCIAL_API_URL = 'https://social.test/';
    mockFetch.mockResolvedValue(jsonResponse(200, positionBody));

    try {
      await getTraderPosition('pos/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://social.test/api/v1/traders/position/pos%2F1',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        }),
      );
    } finally {
      constants.SOCIAL_API_URL = originalHost;
    }
  });
});

describe('toTraderPosition', () => {
  it('treats a missing name and open flag as an open position with an empty name', () => {
    const withoutNameAndOpenFlag: Record<string, unknown> = {
      ...positionBody,
    };
    delete withoutNameAndOpenFlag.tokenName;
    delete withoutNameAndOpenFlag.isOpen;

    const result = toTraderPosition({
      ...withoutNameAndOpenFlag,
      currentValueUSD: null,
      pnlValueUsd: null,
      pnlPercent: null,
    });

    expect(result.tokenName).toBe('');
    expect(result.isOpen).toBe(true);
    expect(result.currentValueUSD).toBeNull();
    expect(result.pnlValueUsd).toBeNull();
    expect(result.pnlPercent).toBeNull();
  });

  it('maps a closed short with leverage fields', () => {
    const result = toTraderPosition({
      ...positionBody,
      isOpen: false,
      perpPositionType: 'short',
      perpLeverage: 3,
      positionAmountWithLeverage: 270,
      costBasisWithLeverage: 263999,
      marginUsd: 88000,
    });

    expect(result.isOpen).toBe(false);
    expect(result.perpPositionType).toBe('short');
    expect(result.perpLeverage).toBe(3);
    expect(result.positionAmountWithLeverage).toBe(270);
    expect(result.costBasisWithLeverage).toBe(263999);
    expect(result.marginUsd).toBe(88000);
  });

  it('maps a long perp side', () => {
    const result = toTraderPosition({
      ...positionBody,
      perpPositionType: 'long',
    });

    expect(result.perpPositionType).toBe('long');
  });

  it('throws when the body is not an object', () => {
    expect(() => toTraderPosition(null)).toThrow(TraderPositionMalformedError);
  });

  it('throws when the open flag is not a boolean', () => {
    expect(() => toTraderPosition({ ...positionBody, isOpen: 'yes' })).toThrow(
      TraderPositionMalformedError,
    );
  });

  it('throws when a required string is empty', () => {
    expect(() => toTraderPosition({ ...positionBody, positionId: '' })).toThrow(
      TraderPositionMalformedError,
    );
  });

  it('throws when a numeric field is not a finite number', () => {
    expect(() =>
      toTraderPosition({ ...positionBody, costBasis: Number.NaN }),
    ).toThrow(TraderPositionMalformedError);
  });

  it('throws when a nullable number is a string', () => {
    expect(() =>
      toTraderPosition({ ...positionBody, currentValueUSD: '374380' }),
    ).toThrow(TraderPositionMalformedError);
  });

  it('throws when trades is not a list', () => {
    expect(() => toTraderPosition({ ...positionBody, trades: {} })).toThrow(
      TraderPositionMalformedError,
    );
  });

  it('throws when a trade is not an object', () => {
    expect(() => toTraderPosition({ ...positionBody, trades: [null] })).toThrow(
      TraderPositionMalformedError,
    );
  });

  it('throws when a trade timestamp is not a number', () => {
    expect(() =>
      toTraderPosition({ ...positionBody, trades: [{ timestamp: 'soon' }] }),
    ).toThrow(TraderPositionMalformedError);
  });

  it('throws when the perp side is neither long nor short', () => {
    expect(() =>
      toTraderPosition({ ...positionBody, perpPositionType: 'both' }),
    ).toThrow(TraderPositionMalformedError);
  });
});
