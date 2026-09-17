import type { CompletedRequest, Mockttp } from 'mockttp';
import {
  buildRelayQuoteMock,
  mockRelayQuoteWith,
  mockRelayStatusSuccess,
} from './relay-mocks';
import { mockMoneyAccountApis } from './money-account-deposit-mocks';
import { TX_SENTINEL_NETWORKS_MAP } from '../tx-sentinel-networks-map';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder';
import {
  POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS,
  POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS,
  POLYMARKET_POLYGON_RELAY_POLLING_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_USDC_BALANCE_MOCKS,
  POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS,
} from '../polymarket/polymarket-mocks';
import { createTransactionSentinelResponse } from '../polymarket/polymarket-transaction-sentinel-response.ts';

const PREDICT_PUSD_ADDRESS = '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb';
const PREDICT_WITHDRAW_AMOUNT_BASE_UNITS = '5000000'; // $5 pUSD at 6 decimals
const PREDICT_WITHDRAW_ETH_OUT = '1666666666666667'; // ~$5 at $3000/ETH
const PREDICT_WITHDRAW_TX_HASH =
  '0xpredwd1234567890abcdef1234567890abcdef1234567890abcdef12345678';
const PREDICT_MONEY_DEPOSIT_TX_HASH =
  '0xpredmon1234567890abcdef1234567890abcdef1234567890abcdef12345678';

const MONEY_ACCOUNT_TELLER_ADDRESS =
  '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117';
const MUSD_MONAD_ADDRESS = '0xacA92E438df0B2401fF60dA7E4337B687a2435DA';
const MONAD_BORING_VAULT = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';
const MONAD_LENS_ADDRESS = '0xa816ecd922de94c6879ad23b9a884db257f20947';
const MONAD_LENS_HEX = 'a816ecd922de94c6879ad23b9a884db257f20947';
const MUSD_MONAD_HEX = 'aca92e438df0b2401ff60da7e4337b687a2435da';
const MONAD_SPONSORED_DEPOSIT_UUID = 'predict-money-deposit-uuid-1234';
const UINT256_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const UINT256_MAX =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const UINT8_SIX =
  '0x0000000000000000000000000000000000000000000000000000000000000006';
const VAULT_RATE_1E18 = `0x${BigInt('1000000000000000000')
  .toString(16)
  .padStart(64, '0')}`;
const ACCOUNTANT_GET_RATE_SELECTOR = '0x679aefce';
const ERC20_ALLOWANCE_SELECTOR = '0xdd62ed3e';
const ERC20_BALANCE_OF_SELECTOR = '0x70a08231';
const ERC20_DECIMALS_SELECTOR = '0x313ce567';
const MULTICALL3_AGGREGATE3_SELECTOR = '0x82ad56cb';

const PREDICT_WITHDRAW_AMOUNT_USD = '5.00';

const MAINNET_ETH_TOKEN = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
};

const PREDICT_PUSD_TOKEN = {
  address: PREDICT_PUSD_ADDRESS,
  symbol: 'pUSD',
  decimals: 6,
};

const MONAD_MUSD_TOKEN = {
  address: MUSD_MONAD_ADDRESS,
  symbol: 'mUSD',
  decimals: 6,
};

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
};

export async function PREDICT_WITHDRAW_MOCKS(mockServer: Mockttp) {
  await mockPredictWithdrawSupport(mockServer);
  await mockPredictWithdrawalActivity(mockServer);
  await mockAccountsApiTransactions(mockServer);
  await mockAccountsApiActiveNetworks(mockServer);
  await mockPriceApis(mockServer);
  await mockPolygonSentinelSimulateProxy(mockServer);

  const quote = buildRelayQuoteMock({
    srcChainId: 137,
    srcToken: PREDICT_PUSD_TOKEN,
    dstChainId: 137,
    dstToken: PREDICT_PUSD_TOKEN,
    amountIn: PREDICT_WITHDRAW_AMOUNT_BASE_UNITS,
    amountOut: PREDICT_WITHDRAW_AMOUNT_BASE_UNITS,
    amountUsd: PREDICT_WITHDRAW_AMOUNT_USD,
    timeEstimate: 15,
    recipient: DEFAULT_FIXTURE_ACCOUNT,
  });

  await mockRelayQuoteWith(mockServer, quote);
  await mockRelayStatusSuccess(mockServer);
}

export async function PREDICT_WITHDRAW_TO_MONEY_ACCOUNT_MOCKS(
  mockServer: Mockttp,
) {
  await mockPredictWithdrawSupport(mockServer);
  await mockPredictWithdrawalActivity(mockServer);
  await mockAccountsApiTransactions(mockServer, true);
  await mockAccountsApiActiveNetworks(mockServer, true);
  await mockPriceApis(mockServer);
  await mockMoneyAccountApis(mockServer);
  await mockMonadRpc(mockServer);
  await mockMonadSentinel(mockServer);
  await mockSentinelNetworksForPredictAndMonad(mockServer);
  await mockPolygonSentinelSimulateProxy(mockServer);

  const quote = buildRelayQuoteMock({
    srcChainId: 137,
    srcToken: PREDICT_PUSD_TOKEN,
    dstChainId: 143,
    dstToken: MONAD_MUSD_TOKEN,
    amountIn: PREDICT_WITHDRAW_AMOUNT_BASE_UNITS,
    amountOut: PREDICT_WITHDRAW_AMOUNT_BASE_UNITS,
    amountUsd: PREDICT_WITHDRAW_AMOUNT_USD,
    timeEstimate: 15,
    recipient: MONEY_ACCOUNT_TELLER_ADDRESS,
  });

  await mockRelayQuoteWith(mockServer, quote);
  await mockRelayStatusSuccess(mockServer);
}

async function mockPredictWithdrawSupport(mockServer: Mockttp) {
  await POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS(mockServer);
  await POLYMARKET_POLYGON_RELAY_POLLING_MOCKS(mockServer);
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer);
  await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false);
  await POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS(mockServer);
  await mockPredictGeoEligible(mockServer);
}

async function mockPredictGeoEligible(mockServer: Mockttp) {
  const handler = () => ({
    statusCode: 200,
    json: {
      blocked: false,
      country: 'PT',
    },
  });

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('polymarket.com/api/geoblock');
    })
    .thenCallback(handler);

  await mockServer
    .forGet(/^https:\/\/polymarket\.com\/api\/geoblock(\?.*)?$/)
    .asPriority(1001)
    .thenCallback(handler);
}

async function mockPredictWithdrawalActivity(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1002)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('data-api.polymarket.com/activity');
    })
    .thenCallback((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      const userMatch = url.match(/user=(0x[a-fA-F0-9]{40})/u);
      const userAddress = userMatch?.[1] ?? DEFAULT_FIXTURE_ACCOUNT;

      return {
        statusCode: 200,
        json: [
          {
            proxyWallet: userAddress,
            timestamp: Math.floor(Date.now() / 1000),
            conditionId:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
            type: 'WITHDRAWAL',
            size: 5,
            usdcSize: 5,
            transactionHash: PREDICT_WITHDRAW_TX_HASH,
            price: 1,
            asset: '0',
            side: 'WITHDRAW',
            outcomeIndex: 0,
            title: 'Prediction withdrawal',
            slug: 'prediction-withdrawal',
            icon: '',
            eventSlug: 'prediction-withdrawal',
            outcome: 'Prediction withdrawal',
            name: 'MetaMask',
            pseudonym: 'MetaMask',
            bio: '',
            profileImage: '',
            profileImageOptimized: '',
          },
        ],
      };
    });
}

async function mockPriceApis(mockServer: Mockttp) {
  const spotPrices = {
    ...MAINNET_SPOT_PRICES,
    'eip155:137/slip44:60': {
      id: 'eip155:137/slip44:60',
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
    [`eip155:137/erc20:${PREDICT_PUSD_ADDRESS}`]: {
      id: `eip155:137/erc20:${PREDICT_PUSD_ADDRESS}`,
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
    [`eip155:143/erc20:${MUSD_MONAD_ADDRESS}`]: {
      id: `eip155:143/erc20:${MUSD_MONAD_ADDRESS}`,
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
        return { statusCode: 200, json: spotPrices };
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
            },
          },
        };
      }

      if (requestUrl.includes('min-api.cryptocompare.com/data/pricemulti')) {
        return {
          statusCode: 200,
          json: {
            ETH: { USD: 3000 },
            PUSD: { USD: 1 },
            mUSD: { USD: 1 },
            USD: { USD: 1 },
          },
        };
      }

      if (requestUrl.includes('min-api.cryptocompare.com/data/price')) {
        return {
          statusCode: 200,
          json: { USD: 3000 },
        };
      }

      return { statusCode: 200, json: {} };
    });
}

async function mockAccountsApiTransactions(
  mockServer: Mockttp,
  includeMoneyDeposit = false,
) {
  const handler = () => ({
    statusCode: 200,
    json: {
      unprocessedNetworks: [],
      pageInfo: {
        count: includeMoneyDeposit ? 2 : 1,
        hasNextPage: false,
        endCursor: '',
      },
      data: [
        ...(includeMoneyDeposit
          ? [
              {
                hash: PREDICT_MONEY_DEPOSIT_TX_HASH,
                timestamp: new Date().toISOString(),
                chainId: 143,
                blockNumber: 1234568,
                blockHash:
                  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                gas: 21000,
                gasUsed: 21000,
                gasPrice: '1000000000',
                effectiveGasPrice: '1000000000',
                nonce: 2,
                cumulativeGasUsed: 21000,
                value: '0',
                to: MONEY_ACCOUNT_TELLER_ADDRESS,
                from: DEFAULT_FIXTURE_ACCOUNT,
                isError: false,
                transactionType: 'deposit',
                transactionCategory: 'money',
                valueTransfers: [
                  {
                    from: MONEY_ACCOUNT_TELLER_ADDRESS,
                    to: DEFAULT_FIXTURE_ACCOUNT,
                    amount: PREDICT_WITHDRAW_AMOUNT_BASE_UNITS,
                    decimal: 6,
                    contractAddress: MUSD_MONAD_ADDRESS,
                    symbol: 'mUSD',
                    name: 'mUSD',
                    transferType: 'ERC20',
                  },
                ],
              },
            ]
          : []),
        {
          hash: PREDICT_WITHDRAW_TX_HASH,
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
          to: PREDICT_PUSD_ADDRESS,
          from: DEFAULT_FIXTURE_ACCOUNT,
          isError: false,
          transactionType: 'withdraw',
          transactionCategory: 'predict',
          valueTransfers: [
            {
              from: DEFAULT_FIXTURE_ACCOUNT,
              to: includeMoneyDeposit
                ? MONEY_ACCOUNT_TELLER_ADDRESS
                : DEFAULT_FIXTURE_ACCOUNT,
              amount: PREDICT_WITHDRAW_AMOUNT_BASE_UNITS,
              decimal: 6,
              contractAddress: PREDICT_PUSD_ADDRESS,
              symbol: 'pUSD',
              name: 'Polymarket USD',
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

async function mockAccountsApiActiveNetworks(
  mockServer: Mockttp,
  includeMonad = false,
) {
  const handler = () => ({
    statusCode: 200,
    json: {
      activeNetworks: [
        `eip155:137:${DEFAULT_FIXTURE_ACCOUNT}`,
        ...(includeMonad ? [`eip155:143:${DEFAULT_FIXTURE_ACCOUNT}`] : []),
      ],
    },
  });

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('accounts.api.cx.metamask.io/v2/activeNetworks');
    })
    .thenCallback(handler);
}

function toUint256Hex(amountBaseUnits: string): string {
  return `0x${BigInt(amountBaseUnits).toString(16).padStart(64, '0')}`;
}

function encodeAggregate3Result(callData: string): string {
  const n = parseInt(callData.slice(74, 138), 16) || 0;
  let res = '0000000000000000000000000000000000000000000000000000000000000020';
  res += n.toString(16).padStart(64, '0');
  for (let i = 0; i < n; i++) {
    const offset = n * 32 + i * 128;
    res += offset.toString(16).padStart(64, '0');
  }
  for (let i = 0; i < n; i++) {
    res += '0000000000000000000000000000000000000000000000000000000000000001';
    res += '0000000000000000000000000000000000000000000000000000000000000040';
    res += '0000000000000000000000000000000000000000000000000000000000000020';
    res += '0000000000000000000000000000000000000000000000000000000000000000';
  }
  return `0x${res}`;
}

function encodeMoneyBalanceAggregate3(): string {
  const musdValue = BigInt(PREDICT_WITHDRAW_AMOUNT_BASE_UNITS)
    .toString(16)
    .padStart(64, '0');
  const vmusdValue = '0'.padStart(64, '0');
  let res = '0000000000000000000000000000000000000000000000000000000000000020';
  res += '0000000000000000000000000000000000000000000000000000000000000002';
  res += '0000000000000000000000000000000000000000000000000000000000000040';
  res += '00000000000000000000000000000000000000000000000000000000000000c0';
  for (const value of [musdValue, vmusdValue]) {
    res += '0000000000000000000000000000000000000000000000000000000000000001';
    res += '0000000000000000000000000000000000000000000000000000000000000040';
    res += '0000000000000000000000000000000000000000000000000000000000000020';
    res += value;
  }
  return `0x${res}`;
}

function isMoneyBalanceQuery(callData: string): boolean {
  const lower = callData.toLowerCase();
  return lower.includes(MONAD_LENS_HEX) && lower.includes(MUSD_MONAD_HEX);
}

function toLogData(amountBaseUnits: string): string {
  return `0x${BigInt(amountBaseUnits).toString(16).padStart(64, '0')}`;
}

function resolveMonadRpcResult(body: Record<string, unknown>): unknown {
  const method = body?.method as string;

  if (method === 'eth_getTransactionReceipt') {
    const requestedHash =
      (body?.params as string[])?.[0] ?? PREDICT_MONEY_DEPOSIT_TX_HASH;
    return {
      transactionHash: requestedHash,
      transactionIndex: '0x0',
      blockNumber: '0x1234568',
      blockHash:
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: DEFAULT_FIXTURE_ACCOUNT,
      to: MONEY_ACCOUNT_TELLER_ADDRESS,
      cumulativeGasUsed: '0x94670',
      gasUsed: '0x94670',
      contractAddress: null,
      logs: [
        {
          address: MUSD_MONAD_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            `0x000000000000000000000000${DEFAULT_FIXTURE_ACCOUNT.slice(2)}`,
          ],
          data: toLogData(PREDICT_WITHDRAW_AMOUNT_BASE_UNITS),
          blockNumber: '0x1234568',
          transactionHash: requestedHash,
        },
      ],
      status: '0x1',
      logsBloom:
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    };
  }

  if (method === 'eth_sendRawTransaction' || method === 'eth_sendTransaction') {
    return PREDICT_MONEY_DEPOSIT_TX_HASH;
  }

  if (method === 'eth_call') {
    const call = (body?.params as Record<string, string>[])?.[0];
    const to = String(call?.to).toLowerCase();
    const data = String(call?.data);
    const selector = data.slice(0, 10);
    if (to === MONAD_LENS_ADDRESS) {
      return toUint256Hex(PREDICT_WITHDRAW_AMOUNT_BASE_UNITS);
    }
    switch (selector) {
      case ACCOUNTANT_GET_RATE_SELECTOR:
        return VAULT_RATE_1E18;
      case ERC20_ALLOWANCE_SELECTOR:
        return UINT256_MAX;
      case ERC20_DECIMALS_SELECTOR:
        return UINT8_SIX;
      case MULTICALL3_AGGREGATE3_SELECTOR:
        return isMoneyBalanceQuery(data)
          ? encodeMoneyBalanceAggregate3()
          : encodeAggregate3Result(data);
      case ERC20_BALANCE_OF_SELECTOR:
      default:
        return UINT256_ZERO;
    }
  }

  if (method === 'eth_getTransactionCount') return '0x0';
  if (method === 'eth_getBlockByNumber') {
    return {
      number: '0x1234568',
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      parentHash:
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      gasLimit: '0x1c9c380',
      gasUsed: '0x94670',
      baseFeePerGas: '0x3b9aca00',
      timestamp: '0x68c0c0c0',
    };
  }
  if (method === 'eth_gasPrice') return '0x3b9aca00';
  if (method === 'eth_estimateGas') return '0x493e0';
  if (method === 'eth_blockNumber') return '0x1234568';
  if (method === 'eth_getBalance') return '0x0';
  if (method === 'eth_chainId') return '0x8f';
  if (method === 'net_version') return '143';

  return '0x';
}

async function mockMonadRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(url?.includes('monad') || url?.includes('8546'));
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;
      return {
        statusCode: 200,
        json: {
          id: body?.id ?? 1,
          jsonrpc: '2.0',
          result: resolveMonadRpcResult(body),
        },
      };
    });
}

async function mockMonadSentinel(mockServer: Mockttp) {
  const simulateResult = (body: Record<string, unknown>) => {
    const params = body.params as Record<string, unknown>[];
    const transactions =
      (params?.[0]?.transactions as Record<string, string>[]) || [];
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
              from: tx.from || DEFAULT_FIXTURE_ACCOUNT,
              to: tx.to || MONEY_ACCOUNT_TELLER_ADDRESS,
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
          id: MONAD_SPONSORED_DEPOSIT_UUID,
        },
        id: body.id,
      },
    };
  };

  const rpcHandler = async (request: CompletedRequest) => {
    const body = (await request.body.getJson()) as Record<string, unknown>;
    if (body?.method === 'infura_simulateTransactions') {
      return simulateResult(body);
    }
    if (body?.method === 'eth_sendRelayTransaction') {
      return {
        statusCode: 200,
        json: {
          jsonrpc: '2.0',
          id: body.id ?? 1,
          result: { uuid: MONAD_SPONSORED_DEPOSIT_UUID },
        },
      };
    }
    return { statusCode: 200, json: { status: 'ok' } };
  };

  await mockServer
    .forPost('https://tx-sentinel-monad-mainnet.api.cx.metamask.io/')
    .asPriority(1001)
    .thenCallback(rpcHandler);

  await mockServer
    .forPost('/proxy')
    .asPriority(1002)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url?.includes('tx-sentinel-monad-mainnet.api.cx.metamask.io'),
      );
    })
    .thenCallback(rpcHandler);

  const statusHandler = () => ({
    statusCode: 200,
    json: {
      transactions: [
        {
          hash: PREDICT_MONEY_DEPOSIT_TX_HASH,
          status: 'VALIDATED',
        },
      ],
    },
  });

  await mockServer
    .forGet(
      `https://tx-sentinel-monad-mainnet.api.cx.metamask.io/smart-transactions/${MONAD_SPONSORED_DEPOSIT_UUID}`,
    )
    .asPriority(1001)
    .thenCallback(statusHandler);

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes(
        `tx-sentinel-monad-mainnet.api.cx.metamask.io/smart-transactions/${MONAD_SPONSORED_DEPOSIT_UUID}`,
      );
    })
    .thenCallback(statusHandler);
}

async function mockSentinelNetworksForPredictAndMonad(mockServer: Mockttp) {
  const withPredictAndMonadRelay = {
    ...TX_SENTINEL_NETWORKS_MAP,
    '137': {
      ...TX_SENTINEL_NETWORKS_MAP['137'],
      relayTransactions: true,
      sendBundle: false,
    },
    '143': {
      ...TX_SENTINEL_NETWORKS_MAP['143'],
      relayTransactions: true,
    },
  };

  const handler = () => ({
    statusCode: 200,
    json: withPredictAndMonadRelay,
  });

  await mockServer
    .forGet('https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks')
    .asPriority(1002)
    .thenCallback(handler);

  await mockServer
    .forGet('/proxy')
    .asPriority(1002)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes(
        'tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks',
      );
    })
    .thenCallback(handler);
}

async function mockPolygonSentinelSimulateProxy(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      if (!url.includes('tx-sentinel-polygon')) {
        return false;
      }

      const bodyText = await request.body.getText();
      const body = bodyText ? JSON.parse(bodyText) : {};
      return body?.method === 'infura_simulateTransactions';
    })
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};

        const requestedTransactions = body?.params?.[0]?.transactions;
        const txList =
          Array.isArray(requestedTransactions) &&
          requestedTransactions.length > 0
            ? requestedTransactions
            : [{}];
        const firstTx = txList[0] || {};
        const fromAddress =
          firstTx.from?.toLowerCase() || DEFAULT_FIXTURE_ACCOUNT.toLowerCase();

        const response = {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            result: {
              transactions: txList.map(
                (tx: Record<string, unknown>) =>
                  createTransactionSentinelResponse(
                    ((tx.from as string) || fromAddress) as string,
                    ((tx.data as string) || '0x') as string,
                  ).result.transactions[0],
              ),
              blockNumber: '0x4a9637e',
              id: 'd1574ab9-ecba-4e33-bf48-b04388a25589',
            },
            id: '7',
          },
        };

        return response;
      } catch (error) {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            result: {
              transactions: [
                {
                  return: '0x',
                  status: '0x1',
                  gasUsed: '0x94670',
                  gasLimit: '0xa49f3',
                  stateDiff: {},
                },
              ],
              blockNumber: '0x4a9637e',
            },
            id: '7',
          },
        };
      }
    });
}
