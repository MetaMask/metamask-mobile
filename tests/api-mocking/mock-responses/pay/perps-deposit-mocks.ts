import type { Mockttp } from 'mockttp';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../perps-arbitrum-mocks';
import { RampsRegions, RampsRegionsEnum } from '../../../framework/Constants';
import {
  buildRelayQuoteMock,
  mockRelayQuoteWith,
  mockRelayStatusSuccess,
} from './relay-mocks';
import { TX_SENTINEL_NETWORKS_MAP } from '../tx-sentinel-networks-map';

export async function PERPS_DEPOSIT_MOCKS(mockServer: Mockttp) {
  await mockHyperLiquidConnection(mockServer);
  await mockHyperLiquidLedger(mockServer);
  await PERPS_ARBITRUM_MOCKS(mockServer);
  await mockPerpsGeolocation(mockServer, RampsRegions[RampsRegionsEnum.SPAIN]);
  await mockArbitrumRpc(mockServer);
  await mockArbitrumSentinel(mockServer);
  await mockSentinelNetworks(mockServer);
  await mockMoneyPositions(mockServer);
  await mockRelaySubmissionStatus(mockServer);
  await mockPriceApis(mockServer);
  await mockPredictActivity(mockServer);
  await mockAccountsApiTransactions(mockServer);
  await mockAccountsApiActiveNetworks(mockServer);

  const quote = buildRelayQuoteMock({
    srcChainId: 42161,
    srcToken: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
    },
    dstChainId: 42161,
    dstToken: {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      decimals: 6,
    },
    amountIn: '26700000000000000',
    amountOut: '80000000',
    amountUsd: '80.00',
    timeEstimate: 15,
    recipient: '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
  });

  await mockRelayQuoteWith(mockServer, quote);
  await mockRelayStatusSuccess(mockServer);
}

async function mockArbitrumRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url');
      if (!url?.includes('https://arb1.arbitrum.io/rpc')) return false;

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
      const mockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      if (method === 'eth_getTransactionReceipt') {
        const requestedHash = (body?.params as string[])?.[0] ?? mockHash;
        result = {
          transactionHash: requestedHash,
          transactionIndex: '0x0',
          blockNumber: '0x1234568',
          blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          from: '0x0000000000000000000000000000000000000000',
          to: '0x0000000000000000000000000000000000000000',
          cumulativeGasUsed: '0x94670',
          gasUsed: '0x94670',
          contractAddress: null,
          logs: [],
          status: '0x1',
          logsBloom: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        };
      } else if (method === 'eth_sendRawTransaction' || method === 'eth_sendTransaction') {
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

async function mockArbitrumSentinel(mockServer: Mockttp) {
  await mockServer
    .forPost('https://tx-sentinel-arbitrum-mainnet.api.cx.metamask.io/')
    .asPriority(1001)
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;

      if (body?.method === 'eth_sendRelayTransaction') {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: body.id ?? 1,
            result: { uuid: 'mocked-uuid-1234' },
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
        url?.includes('tx-sentinel-arbitrum-mainnet.api.cx.metamask.io'),
      );
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;

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
              id: 'mocked-uuid-1234',
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

async function mockPriceApis(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(
        url.includes('price.api.cx.metamask.io/v3/spot-prices') ||
        url.includes('price.api.cx.metamask.io/v1/exchange-rates') ||
        url.includes('min-api.cryptocompare.com/data/price')
      );
    })
    .thenCallback((request) => {
      const requestUrl = new URL(request.url).searchParams.get('url') || '';

      if (requestUrl.includes('price.api.cx.metamask.io/v3/spot-prices')) {
        const isUsd = requestUrl.includes('vsCurrency=usd');
        return {
          statusCode: 200,
          json: {
            'eip155:42161/slip44:60': {
              id: 'eip155:42161/slip44:60',
              price: isUsd ? 3000.0 : 1.0,
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
            'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831': {
              id: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
              price: isUsd ? 1.0 : (1 / 3000.0),
              usd: 1.0,
              eth: 1 / 3000.0,
              marketCap: 1,
              pricePercentChange1h: 0,
              pricePercentChange1d: 0,
              pricePercentChange7d: 0,
              pricePercentChange14d: 0,
              pricePercentChange30d: 0,
              pricePercentChange200d: 0,
              pricePercentChange1y: 0,
            }
          }
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
              value: 1 / 3000.0,
              currencyType: 'crypto',
            }
          }
        };
      }

      if (requestUrl.includes('min-api.cryptocompare.com/data/pricemulti')) {
        return {
          statusCode: 200,
          json: {
            ETH: { USD: 3000 },
            USDC: { USD: 1 },
            USD: { USD: 1 }
          }
        };
      }

      if (requestUrl.includes('min-api.cryptocompare.com/data/price')) {
        return {
          statusCode: 200,
          json: {
            USD: 3000
          }
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
          'eip155:42161/slip44:60': {
            id: 'eip155:42161/slip44:60',
            price: isUsd ? 3000.0 : 1.0,
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
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831': {
            id: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
            price: isUsd ? 1.0 : (1 / 3000.0),
            usd: 1.0,
            eth: 1 / 3000.0,
            marketCap: 1,
            pricePercentChange1h: 0,
            pricePercentChange1d: 0,
            pricePercentChange7d: 0,
            pricePercentChange14d: 0,
            pricePercentChange30d: 0,
            pricePercentChange200d: 0,
            pricePercentChange1y: 0,
          }
        }
      };
    });

  await mockServer
    .forGet(/^https:\/\/price\.api\.cx\.metamask\.io\/v1\/exchange-rates\?.*$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        usd: { name: 'US Dollar', ticker: 'usd', value: 1, currencyType: 'fiat' },
        eth: { name: 'Ether', ticker: 'eth', value: 1 / 3000.0, currencyType: 'crypto' }
      }
    }));

  await mockServer
    .forGet(/^https:\/\/min-api\.cryptocompare\.com\/data\/pricemulti\?.*$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        ETH: { USD: 3000 },
        USDC: { USD: 1 },
        USD: { USD: 1 }
      }
    }));

  await mockServer
    .forGet(/^https:\/\/min-api\.cryptocompare\.com\/data\/price\?.*$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        USD: 3000
      }
    }));
}

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
      json: []
    }));
}

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
          chainId: 42161,
          blockNumber: 1234568,
          blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          gas: 21000,
          gasUsed: 21000,
          gasPrice: '1000000000',
          effectiveGasPrice: '1000000000',
          nonce: 1,
          cumulativeGasUsed: 21000,
          value: '0',
          to: '0x0000000000000000000000000000000000000000',
          from: '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
          isError: false,
          transactionType: 'deposit',
          transactionCategory: 'perps',
          valueTransfers: [
            {
              from: '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
              to: '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
              amount: '80000000',
              decimal: 6,
              contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
              symbol: 'USDC',
              name: 'USD Coin',
              transferType: 'ERC20'
            }
          ]
        }
      ],
    }
  });

  await mockServer
    .forGet('/proxy')
    .asPriority(1001) // Higher priority than the generic accounts.api mock in perps-arbitrum-mocks
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(url.includes('accounts.api.cx.metamask.io') && (url.includes('multi-account/transactions') || url.includes('multiaccount/transactions') || url.includes('transactions')));
    })
    .thenCallback(handler);

  await mockServer
    .forGet(/^https:\/\/accounts\.api\.cx\.metamask\.io\/v4\/multi-account\/transactions(\?.*)?$/)
    .asPriority(1001)
    .thenCallback(handler);
}

/**
 * Mocks the Accounts API v2/activeNetworks endpoint with a valid
 * `{ activeNetworks: [...] }` shape. The shared PERPS_ARBITRUM_MOCKS
 * accounts-api catch-all returns `{ data: [], included: [] }`, which fails
 * the activity screen's struct validation and leaves it loading forever.
 */
async function mockAccountsApiActiveNetworks(mockServer: Mockttp) {
  const handler = () => ({
    statusCode: 200,
    json: {
      activeNetworks: [
        'eip155:42161:0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
      ],
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
    .forGet(/^https:\/\/accounts\.api\.cx\.metamask\.io\/v2\/activeNetworks(\?.*)?$/)
    .asPriority(1001)
    .thenCallback(handler);
}

async function mockSentinelNetworks(mockServer: Mockttp) {
  await mockServer
    .forGet('https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks')
    .asPriority(1001)
    .thenCallback(() => {
      const withArbitrumRelay = {
        ...TX_SENTINEL_NETWORKS_MAP,
        '42161': {
          ...TX_SENTINEL_NETWORKS_MAP['42161'],
          relayTransactions: true,
        },
      };
      return {
        statusCode: 200,
        json: withArbitrumRelay,
      };
    });
}

async function mockRelaySubmissionStatus(mockServer: Mockttp) {
  await mockServer
    .forGet('https://tx-sentinel-arbitrum-mainnet.api.cx.metamask.io/smart-transactions/mocked-uuid-1234')
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        transactions: [
          {
            hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            status: 'VALIDATED',
          },
        ],
      },
    }));
}


/**
 * Mocks the Money API positions endpoint to return an empty positions array.
 * This satisfies the money-account-api-data-service when moneyAccount features are enabled
 * via the base RC feature flags, preventing live unmocked requests on the home screen.
 */
export async function mockMoneyPositions(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(url?.includes('money.api.cx.metamask.io/v1/positions'));
    })
    .asPriority(1001)
    .thenCallback((request) => {
      const targetUrl = new URL(request.url).searchParams.get('url');
      const addressMatch = targetUrl?.match(/\/v1\/positions\/(0x[a-fA-F0-9]{40})/i);
      const address = addressMatch ? addressMatch[1] : '0x0000000000000000000000000000000000000000';
      return {
        statusCode: 200,
        json: {
          address,
          as_of_block: 1000,
          as_of_timestamp: new Date().toISOString(),
          data_freshness: 'live',
          indexer_lag_seconds: 0,
          positions: [],
          balance: {
            musd_balance: '0',
            vmusd_value_in_musd: '0',
            total_balance: '0',
          },
        },
      };
    });

  await mockServer
    .forGet(/money\.api\.cx\.metamask\.io\/v1\/positions\/(0x[a-fA-F0-9]{40})($|\?)/i)
    .asPriority(1001)
    .thenCallback((request) => {
      const addressMatch = request.url.match(/\/v1\/positions\/(0x[a-fA-F0-9]{40})/i);
      const address = addressMatch ? addressMatch[1] : '0x0000000000000000000000000000000000000000';
      return {
        statusCode: 200,
        json: {
          address,
          as_of_block: 1000,
          as_of_timestamp: new Date().toISOString(),
          data_freshness: 'live',
          indexer_lag_seconds: 0,
          positions: [],
          balance: {
            musd_balance: '0',
            vmusd_value_in_musd: '0',
            total_balance: '0',
          },
        },
      };
    });
}

async function mockHyperLiquidConnection(mockServer: Mockttp) {
  await mockServer
    .forAnyWebSocket()
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || request.url;
      return url.includes('api.hyperliquid.xyz/ws');
    })
    .thenPassivelyListen();
}

async function mockHyperLiquidLedger(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1002) // Higher than generic /info mock
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      if (!url.includes('api.hyperliquid.xyz/info')) return false;

      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        return body.type === 'userNonFundingLedgerUpdates';
      } catch {
        return false;
      }
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: [
        {
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          time: Date.now(),
          delta: {
            type: 'deposit',
            usdc: '80',
            coin: 'USDC',
          },
        },
      ],
    }));
}
