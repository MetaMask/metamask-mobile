import type { ClobHeaders } from '../types';
import { submitProtocolClobOrder } from './transport';
import { POLYMARKET_V1_PROTOCOL, POLYMARKET_V2_PROTOCOL } from './definitions';

jest.mock('../utils', () => ({
  getPolymarketEndpoints: jest.fn(() => ({
    CLOB_RELAYER: 'https://predict.api.cx.metamask.io',
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const headers: ClobHeaders = {
  POLY_ADDRESS: '0x1111111111111111111111111111111111111111',
  POLY_SIGNATURE: 'sig',
  POLY_TIMESTAMP: '1',
  POLY_API_KEY: 'key',
  POLY_PASSPHRASE: 'pass',
};

const clobOrder = {
  owner: 'owner',
  orderType: 'FOK',
  order: {
    salt: 1,
    side: 'BUY',
  },
};

describe('polymarket protocol transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits orders without the v2 routing header for v1', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        success: true,
      }),
    });

    await submitProtocolClobOrder({
      protocol: POLYMARKET_V1_PROTOCOL,
      headers,
      clobOrder,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/order',
      expect.objectContaining({
        headers: expect.not.objectContaining({ 'X-Clob-Version': '2' }),
      }),
    );
  });

  it('adds the v2 routing header for v2', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        success: true,
      }),
    });

    await submitProtocolClobOrder({
      protocol: POLYMARKET_V2_PROTOCOL,
      headers,
      clobOrder,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/order',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Clob-Version': '2' }),
      }),
    );
  });

  it('normalizes relay errors into the existing result shape', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));

    await expect(
      submitProtocolClobOrder({
        protocol: POLYMARKET_V2_PROTOCOL,
        headers,
        clobOrder,
      }),
    ).resolves.toEqual({
      success: false,
      error: 'Failed to submit CLOB order: boom',
    });
  });
});
