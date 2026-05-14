import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { Side, type OrderPreview } from '../../types';
import { PREDICT_ERROR_CODES } from '../../constants/errors';
import {
  DEFAULT_CLOB_BASE_URL,
  MATIC_CONTRACTS_V2,
  POLYGON_MAINNET_CHAIN_ID,
} from './constants';
import {
  calculateConservativeBuyMarketFee,
  clearClobMarketInfoCache,
  clearClobMarketInfoSessionState,
  createApiKey,
  deriveApiKey,
  getAllowance,
  getClobMarketInfo,
  getClobMarketInfoSafe,
  getContractConfig,
  getIsApprovedForAll,
  getOrderBook,
  getRawBalance,
  parsePolymarketEvents,
  previewOrder,
} from './utils';
import type { PolymarketApiEvent, PolymarketApiTeam } from './types';

const mockSignTypedMessage = jest.fn();

jest.mock('@metamask/controller-utils', () => ({
  query: jest.fn(),
}));

jest.mock('@metamask/eth-query', () =>
  jest.fn().mockImplementation(() => ({})),
);

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

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;
const mockQuery = jest.mocked(query);
const mockLoggerError = jest.mocked(Logger.error);
const mockEthQuery = jest.mocked(EthQuery);
const mockFindNetworkClientIdByChainId = jest.mocked(
  Engine.context.NetworkController.findNetworkClientIdByChainId,
);
const mockGetNetworkClientById = jest.mocked(
  Engine.context.NetworkController.getNetworkClientById,
);

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

const buyPreview: OrderPreview = {
  marketId: 'market-1',
  outcomeId: 'condition-1',
  outcomeTokenId: 'token-1',
  timestamp: 1,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 20,
  slippage: 0.1,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  feeRateBps: '0',
};

describe('polymarket utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearClobMarketInfoSessionState();
    mockSignTypedMessage.mockResolvedValue('0xsig');
    mockFindNetworkClientIdByChainId.mockReturnValue('test-network-client-id');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    } as ReturnType<
      typeof Engine.context.NetworkController.getNetworkClientById
    >);
  });

  it('parses World Cup game events with game metadata when team data is available', () => {
    const teamsByAbbreviation: Record<string, PolymarketApiTeam> = {
      usa: {
        id: 'team-usa',
        name: 'United States',
        logo: 'usa.png',
        abbreviation: 'usa',
        color: 'red',
        alias: 'USA',
        league: 'fifwc',
      },
      can: {
        id: 'team-can',
        name: 'Canada',
        logo: 'can.png',
        abbreviation: 'can',
        color: 'white',
        alias: 'CAN',
        league: 'fifwc',
      },
    };
    const event: PolymarketApiEvent = {
      id: 'event-1',
      slug: 'fifwc-usa-can-2026-06-12',
      title: 'United States vs Canada',
      description: 'World Cup match',
      icon: 'icon.png',
      closed: false,
      series: [
        {
          id: '11433',
          slug: 'world-cup',
          title: 'World Cup',
          recurrence: 'none',
        },
      ],
      markets: [
        {
          conditionId: 'condition-1',
          question: 'United States vs Canada',
          description: 'Market description',
          icon: 'icon.png',
          image: 'image.png',
          groupItemTitle: 'United States',
          sportsMarketType: 'moneyline',
          status: 'open',
          volumeNum: 100,
          liquidity: 100,
          negRisk: false,
          clobTokenIds: '["token-yes","token-no"]',
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.5","0.5"]',
          closed: false,
          active: true,
          resolvedBy: '',
          orderPriceMinTickSize: 0.01,
          umaResolutionStatus: '',
        },
      ],
      tags: [
        { id: 'games', label: 'Games', slug: 'games' },
        { id: 'world-cup', label: 'World Cup', slug: 'fifa-world-cup' },
      ],
      liquidity: 100,
      volume: 100,
      gameId: 'game-1',
      startTime: '2026-06-12T20:00:00.000Z',
      live: false,
      ended: false,
    };

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) => teamsByAbbreviation[abbreviation],
    });

    expect(market.game).toEqual(
      expect.objectContaining({
        id: 'game-1',
        league: 'fifwc',
        startTime: '2026-06-12T20:00:00.000Z',
        status: 'scheduled',
        homeTeam: expect.objectContaining({ abbreviation: 'usa' }),
        awayTeam: expect.objectContaining({ abbreviation: 'can' }),
      }),
    );
  });

  it('creates API keys against the canonical CLOB host', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue(apiKeyCreds),
      text: jest.fn().mockResolvedValue(JSON.stringify(apiKeyCreds)),
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
      text: jest.fn().mockResolvedValue(JSON.stringify(apiKeyCreds)),
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
        text: jest.fn().mockResolvedValue('Bad Request'),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue(apiKeyCreds),
        text: jest.fn().mockResolvedValue(JSON.stringify(apiKeyCreds)),
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

  it('fetches CLOB market info and caches by condition ID', async () => {
    const marketInfo = {
      fd: {
        r: 0.02,
        e: 1,
        to: true,
      },
      mts: 1,
      mos: 1,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(marketInfo),
    });

    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).resolves.toEqual(marketInfo);
    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).resolves.toEqual(marketInfo);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/clob-markets/condition-1`,
      { method: 'GET' },
    );
  });

  it('rejects invalid CLOB market info responses without caching', async () => {
    const validMarketInfo = {
      fd: {
        r: 0.02,
        e: 1,
        to: true,
      },
      mts: 1,
      mos: 1,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          fd: 'invalid',
          mts: '1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(validMarketInfo),
      });

    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).rejects.toThrow('Invalid CLOB market info response');
    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).resolves.toEqual(validMarketInfo);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('logs CLOB market info failures once per condition ID and fails open', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();
    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'Predict',
          provider: 'polymarket',
        }),
        context: expect.objectContaining({
          name: 'PolymarketUtils',
          data: expect.objectContaining({
            method: 'getClobMarketInfo',
            conditionId: 'condition-1',
          }),
        }),
      }),
    );
  });

  it('clears CLOB market info failure suppression after a later success', async () => {
    const marketInfo = {
      fd: {
        r: 0.02,
        e: 1,
        to: true,
      },
    };

    mockFetch
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(marketInfo),
      })
      .mockRejectedValueOnce(new Error('network down again'));

    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();
    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toEqual(marketInfo);

    clearClobMarketInfoCache();

    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledTimes(2);
  });

  describe('calculateConservativeBuyMarketFee', () => {
    it('uses endpoint maximum when no interior critical point is in the interval', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.02,
              e: 1,
            },
          },
        }),
      ).toBe(0.1);
    });

    it('uses the interior critical point when it is inside the interval', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: {
            ...buyPreview,
            minAmountReceived: 50,
            slippage: 0.5,
          },
          marketInfo: {
            fd: {
              r: 0.02,
              e: 2,
            },
          },
        }),
      ).toBe(0.02963);
    });

    it('treats exponent zero as valid', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.02,
              e: 0,
            },
          },
        }),
      ).toBe(0.4);
    });

    it('returns zero when the fee rate is zero', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });

    it('returns zero for invalid fee metadata', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.02,
              e: -1,
            },
          },
        }),
      ).toBe(0);
    });

    it('returns zero when the buy interval cannot be derived', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: {
            ...buyPreview,
            minAmountReceived: 0,
          },
          marketInfo: {
            fd: {
              r: 0.02,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });

    it('rounds the market fee to five decimals', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.0246912,
              e: 1,
            },
          },
        }),
      ).toBe(0.12346);
    });

    it('rounds values below half of the smallest unit to zero', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.0000008,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });

    it('returns zero for SELL previews', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: {
            ...buyPreview,
            side: Side.SELL,
          },
          marketInfo: {
            fd: {
              r: 0.02,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });
  });

  it('previews buy orders with CLOB market fee and zero fee-rate bps', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(orderBook),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          fd: {
            r: 0.02,
            e: 1,
            to: true,
          },
        }),
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
        fees: expect.objectContaining({
          marketFee: 0.1,
          totalFee: 0,
          totalFeePercentage: 0,
        }),
        negRisk: false,
      }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/clob-markets/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
      { method: 'GET' },
    );
  });

  it('does not fetch CLOB market info for sell previews', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(orderBook),
    });

    const preview = await previewOrder({
      marketId: 'market-1',
      outcomeId:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      outcomeTokenId: 'token-1',
      side: Side.SELL,
      size: 10,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        marketId: 'market-1',
        outcomeTokenId: 'token-1',
        feeRateBps: '0',
        side: Side.SELL,
      }),
    );
    expect(preview.fees).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/book?token_id=token-1`,
      { method: 'GET' },
    );
  });

  it('returns the v2 contract config for Polygon', () => {
    expect(getContractConfig(POLYGON_MAINNET_CHAIN_ID)).toBe(
      MATIC_CONTRACTS_V2,
    );
  });

  it('treats empty balance results as zero', async () => {
    mockQuery.mockResolvedValue('0x');

    await expect(
      getRawBalance({
        address: '0x1111111111111111111111111111111111111111',
        tokenAddress: '0x2222222222222222222222222222222222222222',
      }),
    ).resolves.toBe(0n);

    expect(mockEthQuery).toHaveBeenCalled();
  });

  it('treats empty allowance results as zero', async () => {
    mockQuery.mockResolvedValue('0x');

    await expect(
      getAllowance({
        tokenAddress: '0x2222222222222222222222222222222222222222',
        owner: '0x1111111111111111111111111111111111111111',
        spender: '0x3333333333333333333333333333333333333333',
      }),
    ).resolves.toBe(0n);
  });

  it('treats empty approval results as false', async () => {
    mockQuery.mockResolvedValue('0x');

    await expect(
      getIsApprovedForAll({
        tokenAddress: '0x2222222222222222222222222222222222222222',
        owner: '0x1111111111111111111111111111111111111111',
        operator: '0x3333333333333333333333333333333333333333',
      }),
    ).resolves.toBe(false);
  });
});
