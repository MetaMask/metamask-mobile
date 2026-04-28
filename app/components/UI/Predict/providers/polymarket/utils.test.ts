import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { Side } from '../../types';
import { PREDICT_ERROR_CODES } from '../../constants/errors';
import {
  DEFAULT_CLOB_BASE_URL,
  MATIC_CONTRACTS_V2,
  POLYGON_MAINNET_CHAIN_ID,
} from './constants';
import {
  createApiKey,
  deriveApiKey,
  getContractConfig,
  getOrderBook,
  previewOrder,
} from './utils';

const mockSignTypedMessage = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: (...args: unknown[]) => mockSignTypedMessage(...args),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const apiKeyCreds = {
  apiKey: 'api-key',
  secret: 'secret',
  passphrase: 'passphrase',
};

const orderBook = {
  market: 'market-1',
  asset_id: 'token-1',
  hash: 'hash',
  timestamp: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  asks: [{ price: '0.50', size: '100' }],
  bids: [{ price: '0.49', size: '100' }],
  min_order_size: '1',
  tick_size: '0.01',
  neg_risk: false,
};

describe('polymarket utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignTypedMessage.mockResolvedValue('0xsig');
  });

  it('creates API keys against the canonical CLOB host', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue(apiKeyCreds),
    });

    await expect(
      createApiKey({ address: '0x1111111111111111111111111111111111111111' }),
    ).resolves.toEqual(apiKeyCreds);

    expect(mockSignTypedMessage).toHaveBeenCalledWith(
      expect.any(Object),
      SignTypedDataVersion.V4,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/auth/api-key`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('derives API keys against the canonical CLOB host', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue(apiKeyCreds),
    });

    await expect(
      deriveApiKey({ address: '0x1111111111111111111111111111111111111111' }),
    ).resolves.toEqual(apiKeyCreds);

    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/auth/derive-api-key`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('falls back to deriving an API key when creation returns 400', async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: jest.fn(),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue(apiKeyCreds),
      });

    await expect(
      createApiKey({ address: '0x1111111111111111111111111111111111111111' }),
    ).resolves.toEqual(apiKeyCreds);

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${DEFAULT_CLOB_BASE_URL}/auth/api-key`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${DEFAULT_CLOB_BASE_URL}/auth/derive-api-key`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fetches order books from the canonical CLOB host', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(orderBook),
    });

    await expect(getOrderBook({ tokenId: 'token-1' })).resolves.toEqual(
      orderBook,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/book?token_id=token-1`,
      { method: 'GET' },
    );
  });

  it('maps missing order book errors to the Predict preview error code', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'No orderbook exists for the requested token id',
      }),
    });

    await expect(getOrderBook({ tokenId: 'token-1' })).rejects.toThrow(
      PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_BOOK,
    );
  });

  it('previews orders using CLOB v2 order books and zero fee-rate bps', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(orderBook),
    });

    const preview = await previewOrder({
      marketId: 'market-1',
      outcomeId:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      outcomeTokenId: 'token-1',
      side: Side.BUY,
      size: 10,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        marketId: 'market-1',
        outcomeTokenId: 'token-1',
        feeRateBps: '0',
        negRisk: false,
      }),
    );
  });

  it('returns the v2 contract config for Polygon', () => {
    expect(getContractConfig(POLYGON_MAINNET_CHAIN_ID)).toBe(
      MATIC_CONTRACTS_V2,
    );
  });
});
