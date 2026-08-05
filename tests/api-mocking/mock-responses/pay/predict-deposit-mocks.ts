import type { Mockttp } from 'mockttp';
import {
  buildRelayQuoteMock,
  mockRelayQuoteWith,
  mockRelayStatusSuccess,
} from './relay-mocks.js';
import { TX_SENTINEL_NETWORKS_MAP } from '../tx-sentinel-networks-map.js';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder.js';
import {
  POLYMARKET_USDC_BALANCE_MOCKS,
  POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS,
} from '../polymarket/polymarket-mocks.js';
import { USDC_MAINNET } from '../../../constants/musd-mainnet.js';
import { mockMoneyAccountApis } from './money-account-deposit-mocks.js';

export const POLYGON_USDC =
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174' as const;

const MAINNET_SPOT_PRICES = {
  'eip155:1/slip44:60': {
    id: 'eip155:1/slip44:60',
    price: 3000.0,
    usd: 3000.0,
    eth: 1.0,
    marketCap: 1,
    pricePercentChange1h: 0,
    pricePercentChange1d: 0,
    pricePercentChange7d: 0,
    pricePercentChange14d: 0,
    pricePercentChange30d: 0,
    pricePercentChange200d: 0,
    pricePercentChange1y: 0,
  },
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    price: 1.0,
    usd: 1.0,
    eth: 1.0,
    marketCap: 1,
    pricePercentChange1h: 0,
    pricePercentChange1d: 0,
    pricePercentChange7d: 0,
    pricePercentChange14d: 0,
    pricePercentChange30d: 0,
    pricePercentChange200d: 0,
    pricePercentChange1y: 0,
  },
};

export async function PREDICT_DEPOSIT_MOCKS(mockServer: Mockttp) {
  await mockPredictGeoEligible(mockServer);
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer);
  await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
  await mockMainnetTokenApi(mockServer);
  await mockPolygonRpc(mockServer);
  await mockPolygonSentinel(mockServer);
  await mockSentinelNetworks(mockServer);
  await mockRelaySubmissionStatus(mockServer);
  await mockPriceApis(mockServer);
  await mockPredictActivity(mockServer);
  await mockAccountsApiTransactions(mockServer);
  await mockAccountsApiActiveNetworks(mockServer);
  await mockMoneyAccountApis(mockServer);

  const quote = buildRelayQuoteMock({
    srcChainId: 1,
    srcToken: {
      address: USDC_MAINNET,
      symbol: 'USDC',
      decimals: 6,
    },
    dstChainId: 137,
    dstToken: {
      address: POLYGON_USDC,
      symbol: 'USDC',
      decimals: 6,
    },
    amountIn: '50000000',
    amountOut: '50000000',
    amountUsd: '50.00',
    timeEstimate: 15,
    recipient: DEFAULT_FIXTURE_ACCOUNT,
  });

  await mockRelayQuoteWith(mockServer, quote);
  await mockRelayStatusSuccess(mockServer);
}

/**
 * Mocks the Polygon RPC for sending raw transactions and fetching receipts.
 */
async function mockPolygonRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url');
      if (
        !url?.includes('polygon-rpc.com') &&
        !url?.includes('polygon-mainnet.infura.io')
      )
        return false;

      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const method = body.method as string | undefined;
        return (
          method === 'eth_sendRawTransaction' ||
          method === 'eth_sendTransaction' ||
          method === 'eth_getTransactionReceipt'
        );
      } catch {
        return false;
      }
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;
      const method = body?.method as string;

      let result: unknown = '0x';
      const mockHash =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      if (method === 'eth_getTransactionReceipt') {
        const requestedHash = (body?.params as string[])?.[0] ?? mockHash;
        result = {
          transactionHash: requestedHash,
          transactionIndex: '0x0',
          blockNumber: '0x1234568',
          blockHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          from: '0x0000000000000000000000000000000000000000',
          to: '0x0000000000000000000000000000000000000000',
          cumulativeGasUsed: '0x94670',
          gasUsed: '0x94670',
          contractAddress: null,
          logs: [],
          status: '0x1',
          logsBloom:
            '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        };
      } else if (
        method === 'eth_sendRawTransaction' ||
        method === 'eth_sendTransaction'
      ) {
        result = mockHash;
      }

      return {
        statusCode: 200,
        json: {
          id: body?.id ?? 1,
          jsonrpc: '2.0',
          result,
        },
      };
    });
}

/**
 * Mocks the Polygon TX Sentinel for relay transactions.
 */
async function mockPolygonSentinel(mockServer: Mockttp) {
  await mockServer
    .forPost('https://tx-sentinel-polygon-mainnet.api.cx.metamask.io/')
    .asPriority(1001)
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;

      if (body?.method === 'eth_sendRelayTransaction') {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: body.id ?? 1,
            result: { uuid: 'mocked-predict-uuid-1234' },
          },
        };
      }

      return {
        statusCode: 200,
        json: { status: 'ok' },
      };
    });

  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url?.includes('tx-sentinel-polygon-mainnet.api.cx.metamask.io'),
      );
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;

      if (body?.method === 'eth_sendRelayTransaction') {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: body.id ?? 1,
            result: { uuid: 'mocked-predict-uuid-1234' },
          },
        };
      }

      if (body?.method === 'infura_simulateTransactions') {
        const params = body.params as Record<string, unknown>[];
        const transactions = (params?.[0]?.transactions as Record<
          string,
          string
        >[]) || [{}];
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            result: {
              transactions: transactions.map((tx) => ({
                return: '0x',
                status: '0x1',
                gasUsed: '0x5de2',
                gasLimit: '0x493e0',
                fees: [],
                stateDiff: {},
                callTrace: {
                  from: tx.from || '0x',
                  to: tx.to || '0x',
                  type: 'CALL',
                  gas: tx.gas || '0x493e0',
                  gasUsed: '0x5de2',
                  value: tx.value || '0x0',
                  input: tx.data || '0x',
                  output: '0x',
                  error: '',
                  calls: null,
                },
                feeEstimate: 58176096363000,
                baseFeePerGas: 1770290302,
              })),
              blockNumber: '0x53afbb',
              id: 'mocked-predict-uuid-1234',
            },
            id: body.id,
          },
        };
      }

      return {
        statusCode: 200,
        json: { status: 'ok' },
      };
    });
}

/**
 * Mocks the tx-sentinel networks endpoint, enabling Polygon (137) relay transactions.
 */
async function mockSentinelNetworks(mockServer: Mockttp) {
  const withPolygonRelay = {
    ...TX_SENTINEL_NETWORKS_MAP,
    '137': {
      ...TX_SENTINEL_NETWORKS_MAP['137'],
      relayTransactions: true,
    },
  };

  const handler = () => ({
    statusCode: 200,
    json: withPolygonRelay,
  });

  // Direct URL match (non-proxied requests).
  await mockServer
    .forGet('https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks')
    .asPriority(1001)
    .thenCallback(handler);

  // Proxied variant — the fetch shim routes all requests through /proxy?url=...
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes(
        'tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks',
      );
    })
    .thenCallback(handler);
}

/**
 * Mocks the relay submission status to return VALIDATED for the expected uuid.
 */
async function mockRelaySubmissionStatus(mockServer: Mockttp) {
  const handler = () => ({
    statusCode: 200,
    json: {
      transactions: [
        {
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          status: 'VALIDATED',
        },
      ],
    },
  });

  await mockServer
    .forGet(
      'https://tx-sentinel-polygon-mainnet.api.cx.metamask.io/smart-transactions/mocked-predict-uuid-1234',
    )
    .asPriority(1001)
    .thenCallback(handler);

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes(
        'tx-sentinel-polygon-mainnet.api.cx.metamask.io/smart-transactions/mocked-predict-uuid-1234',
      );
    })
    .thenCallback(handler);
}

/**
 * Mocks Polymarket geo-eligibility, required for predict access.
 */
async function mockPredictGeoEligible(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(url.includes('polymarket.com/api/geoblock'));
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        blocked: false,
        country: 'PT',
      },
    }));

  await mockServer
    .forGet(/^https:\/\/polymarket\.com\/api\/geoblock(\?.*)?$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        blocked: false,
        country: 'PT',
      },
    }));
}

/**
 * Mocks the Polymarket activity endpoint.
 */
async function mockPredictActivity(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(url.includes('data-api.polymarket.com/activity'));
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: [],
    }));
}

/**
 * Mocks the price API for Polygon native token and USDC.
 */
async function mockPriceApis(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(
        url.includes('price.api.cx.metamask.io/v3/spot-prices') ||
          url.includes('price.api.cx.metamask.io/v1/exchange-rates') ||
          url.includes('min-api.cryptocompare.com/data/price'),
      );
    })
    .thenCallback((request) => {
      const requestUrl = new URL(request.url).searchParams.get('url') || '';

      if (requestUrl.includes('price.api.cx.metamask.io/v3/spot-prices')) {
        const isUsd = requestUrl.includes('vsCurrency=usd');
        return {
          statusCode: 200,
          json: {
            ...MAINNET_SPOT_PRICES,
            'eip155:137/slip44:60': {
              id: 'eip155:137/slip44:60',
              price: isUsd ? 1.0 : 1.0,
              usd: 1.0,
              eth: 1.0,
              marketCap: 1,
              pricePercentChange1h: 0,
              pricePercentChange1d: 0,
              pricePercentChange7d: 0,
              pricePercentChange14d: 0,
              pricePercentChange30d: 0,
              pricePercentChange200d: 0,
              pricePercentChange1y: 0,
            },
            'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174': {
              id: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
              price: isUsd ? 1.0 : 1.0,
              usd: 1.0,
              eth: 1.0,
              marketCap: 1,
              pricePercentChange1h: 0,
              pricePercentChange1d: 0,
              pricePercentChange7d: 0,
              pricePercentChange14d: 0,
              pricePercentChange30d: 0,
              pricePercentChange200d: 0,
              pricePercentChange1y: 0,
            },
          },
        };
      }

      if (requestUrl.includes('price.api.cx.metamask.io/v1/exchange-rates')) {
        return {
          statusCode: 200,
          json: {
            usd: {
              name: 'US Dollar',
              ticker: 'usd',
              value: 1,
              currencyType: 'fiat',
            },
            eth: {
              name: 'Ether',
              ticker: 'eth',
              value: 1,
              currencyType: 'crypto',
            },
          },
        };
      }

      if (requestUrl.includes('min-api.cryptocompare.com/data/pricemulti')) {
        return {
          statusCode: 200,
          json: {
            ETH: { USD: 1 },
            USDC: { USD: 1 },
            USD: { USD: 1 },
          },
        };
      }

      if (requestUrl.includes('min-api.cryptocompare.com/data/price')) {
        return {
          statusCode: 200,
          json: {
            USD: 1,
          },
        };
      }

      return { statusCode: 200, json: {} };
    });

  await mockServer
    .forGet(/^https:\/\/price\.api\.cx\.metamask\.io\/v3\/spot-prices(\?.*)?$/)
    .asPriority(1001)
    .thenCallback(async (request) => {
      const isUsd = request.url.includes('vsCurrency=usd');
      return {
        statusCode: 200,
        json: {
          ...MAINNET_SPOT_PRICES,
          'eip155:137/slip44:60': {
            id: 'eip155:137/slip44:60',
            price: isUsd ? 1.0 : 1.0,
            usd: 1.0,
            eth: 1.0,
            marketCap: 1,
            pricePercentChange1h: 0,
            pricePercentChange1d: 0,
            pricePercentChange7d: 0,
            pricePercentChange14d: 0,
            pricePercentChange30d: 0,
            pricePercentChange200d: 0,
            pricePercentChange1y: 0,
          },
          'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174': {
            id: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            price: isUsd ? 1.0 : 1.0,
            usd: 1.0,
            eth: 1.0,
            marketCap: 1,
            pricePercentChange1h: 0,
            pricePercentChange1d: 0,
            pricePercentChange7d: 0,
            pricePercentChange14d: 0,
            pricePercentChange30d: 0,
            pricePercentChange200d: 0,
            pricePercentChange1y: 0,
          },
        },
      };
    });

  await mockServer
    .forGet(/^https:\/\/price\.api\.cx\.metamask\.io\/v1\/exchange-rates\?.*$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        usd: {
          name: 'US Dollar',
          ticker: 'usd',
          value: 1,
          currencyType: 'fiat',
        },
        eth: { name: 'Ether', ticker: 'eth', value: 1, currencyType: 'crypto' },
      },
    }));

  await mockServer
    .forGet(/^https:\/\/min-api\.cryptocompare\.com\/data\/pricemulti\?.*$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        ETH: { USD: 1 },
        USDC: { USD: 1 },
        USD: { USD: 1 },
      },
    }));

  await mockServer
    .forGet(/^https:\/\/min-api\.cryptocompare\.com\/data\/price\?.*$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        USD: 1,
      },
    }));
}

/**
 * Mocks the accounts API transaction endpoint to return a predict deposit transaction.
 */
async function mockAccountsApiTransactions(mockServer: Mockttp) {
  const handler = () => ({
    statusCode: 200,
    json: {
      unprocessedNetworks: [],
      pageInfo: {
        count: 1,
        hasNextPage: false,
        endCursor: '',
      },
      data: [
        {
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          timestamp: new Date().toISOString(),
          chainId: 137,
          blockNumber: 1234568,
          blockHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          gas: 21000,
          gasUsed: 21000,
          gasPrice: '1000000000',
          effectiveGasPrice: '1000000000',
          nonce: 1,
          cumulativeGasUsed: 21000,
          value: '0',
          to: '0x0000000000000000000000000000000000000000',
          from: DEFAULT_FIXTURE_ACCOUNT,
          isError: false,
          transactionType: 'deposit',
          transactionCategory: 'predict',
          valueTransfers: [
            {
              from: DEFAULT_FIXTURE_ACCOUNT,
              to: DEFAULT_FIXTURE_ACCOUNT,
              amount: '50000000',
              decimal: 6,
              contractAddress: POLYGON_USDC,
              symbol: 'USDC',
              name: 'USD Coin',
              transferType: 'ERC20',
            },
          ],
        },
      ],
    },
  });

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(
        url.includes('accounts.api.cx.metamask.io') &&
          (url.includes('multi-account/transactions') ||
            url.includes('multiaccount/transactions') ||
            url.includes('transactions')),
      );
    })
    .thenCallback(handler);

  await mockServer
    .forGet(
      /^https:\/\/accounts\.api\.cx\.metamask\.io\/v4\/multi-account\/transactions(\?.*)?$/,
    )
    .asPriority(1001)
    .thenCallback(handler);
}

/**
 * Mocks the accounts API active networks endpoint.
 */
async function mockAccountsApiActiveNetworks(mockServer: Mockttp) {
  const handler = () => ({
    statusCode: 200,
    json: {
      activeNetworks: [`eip155:137:${DEFAULT_FIXTURE_ACCOUNT}`],
    },
  });

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(
        url.includes('accounts.api.cx.metamask.io/v2/activeNetworks'),
      );
    })
    .thenCallback(handler);

  await mockServer
    .forGet(
      /^https:\/\/accounts\.api\.cx\.metamask\.io\/v2\/activeNetworks(\?.*)?$/,
    )
    .asPriority(1001)
    .thenCallback(handler);
}

/**
 * Mocks the Mainnet USDC token metadata endpoint so the pay token renders in
 * the picker. Balance reads are handled by applyTokenHoldingsMocks.
 */
async function mockMainnetTokenApi(mockServer: Mockttp) {
  await mockServer
    .forGet(
      /^https:\/\/token\.api\.cx\.metamask\.io\/token\/1\?.*address=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/i,
    )
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        address: USDC_MAINNET,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    }));
}
