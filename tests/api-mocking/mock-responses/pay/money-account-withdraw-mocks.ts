import type { Mockttp } from 'mockttp';
import {
  buildRelayQuoteMock,
  mockRelayQuoteWith,
  mockRelayStatusSuccess,
} from './relay-mocks';
import { TX_SENTINEL_NETWORKS_MAP } from '../tx-sentinel-networks-map';
import { USDC_MAINNET } from '../../../constants/musd-mainnet';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder';

const MUSD_MONAD = '0xacA92E438df0B2401fF60dA7E4337B687a2435DA';
const MUSD_MONAD_HEX = 'aca92e438df0b2401ff60da7e4337b687a2435da';
const DEV_BORING_VAULT = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';
const DEV_LENS = '0xa816ecd922de94c6879ad23b9a884db257f20947';
const DEV_LENS_HEX = 'a816ecd922de94c6879ad23b9a884db257f20947';
// Deterministic e2e Money Account address (matches deposit receipt logs).
const E2E_MONEY_ACCOUNT = '0x88e4c776e4598b098022c253159d5804d45ceca8';
const UINT256_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

function toUint256Hex(amountBaseUnits: string): string {
  return `0x${BigInt(amountBaseUnits).toString(16).padStart(64, '0')}`;
}

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

export interface MoneyAccountWithdrawMocksOptions {
  dstChainId?: number;
  dstTokenAddress?: string;
  dstTokenSymbol?: string;
  amountBaseUnits?: string;
  amountUsd?: string;
  fundedBaseUnits?: string;
  recipient?: string;
}

export async function MONEY_ACCOUNT_WITHDRAW_MOCKS(
  mockServer: Mockttp,
  options: MoneyAccountWithdrawMocksOptions = {},
) {
  const {
    dstChainId = 1,
    dstTokenAddress = USDC_MAINNET,
    dstTokenSymbol = 'USDC',
    amountBaseUnits = '50000000',
    amountUsd = '50.00',
    fundedBaseUnits = '500000000',
    recipient = DEFAULT_FIXTURE_ACCOUNT,
  } = options;

  await mockMoneyAccountBalance(mockServer, fundedBaseUnits);
  await mockMoneyAccountInterest(mockServer);
  await mockVedaApy(mockServer);
  await mockTokenApiMetadata(mockServer);
  await mockMainnetTokenApi(mockServer);
  await mockMonadTokenApi(mockServer);
  await mockMainnetRpc(mockServer);
  await mockMonadRpc(mockServer, amountBaseUnits, fundedBaseUnits);
  await mockMainnetSentinel(mockServer);
  await mockMonadSentinel(mockServer);
  await mockSentinelNetworks(mockServer);
  await mockRelaySubmissionStatus(mockServer);
  await mockPriceApis(mockServer);
  await mockAccountsApiTransactions(mockServer, amountBaseUnits);
  await mockAccountsApiActiveNetworks(mockServer);
  await mockMoneyAccountApis(mockServer, fundedBaseUnits);

  const quote = buildRelayQuoteMock({
    srcChainId: 143,
    srcToken: {
      address: MUSD_MONAD,
      symbol: 'mUSD',
      decimals: 6,
    },
    dstChainId,
    dstToken: {
      address: dstTokenAddress,
      symbol: dstTokenSymbol,
      decimals: 6,
    },
    amountIn: amountBaseUnits,
    amountOut: amountBaseUnits,
    amountUsd,
    timeEstimate: 15,
    recipient,
  });

  await mockRelayQuoteWith(mockServer, quote);
  await mockRelayStatusSuccess(mockServer);
}

async function mockMainnetRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url');
      // Match only real Mainnet URLs. Other chains' Infura URLs contain the
      // 'mainnet.infura.io' substring too (e.g. polygon-mainnet.infura.io)
      // and must fall through to their own mocks — otherwise Polygon gets
      // Mainnet responses (no EIP-1559 block data), producing type-0x4
      // envelope errors on Predict flows.
      if (
        !url?.includes('://mainnet.infura.io/') &&
        !url?.includes('eth.llamarpc.com')
      ) {
        return false;
      }

      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const method = body.method as string | undefined;
        return Boolean(method);
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
            '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        };
      } else if (
        method === 'eth_sendRawTransaction' ||
        method === 'eth_sendTransaction'
      ) {
        result = mockHash;
      } else if (method === 'eth_chainId') {
        result = '0x1';
      } else if (method === 'net_version') {
        result = '1';
      } else if (method === 'eth_blockNumber') {
        result = '0x1234568';
      } else if (method === 'eth_getTransactionCount') {
        result = '0x1';
      } else if (method === 'eth_estimateGas') {
        result = '0x186a0';
      } else if (method === 'eth_gasPrice') {
        result = '0x3b9aca00';
      } else if (method === 'eth_call') {
        const call = (body?.params as Record<string, string>[])?.[0];
        const data = String(call?.data ?? '');
        // Accountant getRate() for Money Account withdraw amount updates.
        // Mainnet mock previously returned zero here, causing a division by
        // zero in getSharesForWithdrawal when the withdraw confirmation
        // resolves its provider to the Mainnet network client.
        if (data.slice(0, 10).toLowerCase() === '0x679aefce') {
          result = `0x${BigInt('1000000000000000000').toString(16).padStart(64, '0')}`;
        } else {
          result = UINT256_ZERO;
        }
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

const UINT256_MAX =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const UINT8_SIX =
  '0x0000000000000000000000000000000000000000000000000000000000000006';
const ERC20_BALANCE_OF_SELECTOR = '0x70a08231';
const ERC20_ALLOWANCE_SELECTOR = '0xdd62ed3e';
const ERC20_DECIMALS_SELECTOR = '0x313ce567';
const MULTICALL3_AGGREGATE3_SELECTOR = '0x82ad56cb';
const ACCOUNTANT_GET_RATE_SELECTOR = '0x679aefce';
const VAULT_RATE_1E18 = `0x${BigInt('1000000000000000000').toString(16).padStart(64, '0')}`;

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
  return '0x' + res;
}

function encodeMoneyBalanceAggregate3(fundedBaseUnits: string): string {
  const musdValue = '0'.padStart(64, '0');
  const vmusdValue = BigInt(fundedBaseUnits).toString(16).padStart(64, '0');
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
  return '0x' + res;
}

function toLogData(amountBaseUnits: string): string {
  return `0x${BigInt(amountBaseUnits).toString(16).padStart(64, '0')}`;
}

function isMoneyBalanceQuery(callData: string): boolean {
  const lower = callData.toLowerCase();
  return lower.includes(DEV_LENS_HEX) && lower.includes(MUSD_MONAD_HEX);
}

function resolveMonadRpcResult(
  body: Record<string, unknown>,
  settledBaseUnits: string,
  fundedBaseUnits: string,
): unknown {
  const method = body?.method as string;
  const mockHash =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  if (method === 'eth_getTransactionReceipt') {
    const requestedHash = (body?.params as string[])?.[0] ?? mockHash;
    return {
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
      logs: [
        {
          address: MUSD_MONAD,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            `0x000000000000000000000000${E2E_MONEY_ACCOUNT.slice(2)}`,
          ],
          data: toLogData(settledBaseUnits),
          blockNumber: '0x1234568',
          transactionHash: requestedHash,
        },
      ],
      status: '0x1',
      logsBloom:
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    };
  }

  if (method === 'eth_sendRawTransaction' || method === 'eth_sendTransaction') {
    return mockHash;
  }

  if (method === 'eth_call') {
    const call = (body?.params as Record<string, string>[])?.[0];
    const to = String(call?.to).toLowerCase();
    const data = String(call?.data);
    const selector = data.slice(0, 10);
    if (to === DEV_LENS) {
      return toUint256Hex(fundedBaseUnits);
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
          ? encodeMoneyBalanceAggregate3(fundedBaseUnits)
          : encodeAggregate3Result(data);
      case ERC20_BALANCE_OF_SELECTOR:
      default:
        return UINT256_ZERO;
    }
  }

  if (method === 'eth_getTransactionCount') {
    return '0x0';
  }
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
  if (method === 'eth_gasPrice') {
    return '0x3b9aca00';
  }
  if (method === 'eth_estimateGas') {
    // Gas units (not price): 300k covers the withdraw + transfer batch.
    // Previously shared the 1-gwei gas-price value (1B units), which exceeds
    // any block gas limit and fails publish-time validation.
    return '0x493e0';
  }
  if (method === 'eth_blockNumber') {
    return '0x1234568';
  }
  if (method === 'eth_getBalance') {
    return '0x0';
  }
  if (method === 'eth_chainId') {
    return '0x8f';
  }

  return '0x';
}

async function mockMonadRpc(
  mockServer: Mockttp,
  settledBaseUnits: string,
  fundedBaseUnits: string,
) {
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
          result: resolveMonadRpcResult(
            body,
            settledBaseUnits,
            fundedBaseUnits,
          ),
        },
      };
    });
}

function isPositionsPath(url: string): boolean {
  try {
    return /^\/v1\/positions\/0x[0-9a-fA-F]+$/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

async function mockMoneyAccountBalance(
  mockServer: Mockttp,
  fundedBaseUnits: string,
) {
  const fundedUsd = (Number(fundedBaseUnits) / 1e6).toString();
  await mockServer
    .forGet('/proxy')
    .asPriority(1002)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('money.api.cx.metamask.io') && isPositionsPath(url);
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        address: DEFAULT_FIXTURE_ACCOUNT,
        as_of_block: 1234568,
        as_of_timestamp: new Date().toISOString(),
        data_freshness: 'live',
        indexer_lag_seconds: 0,
        positions: [
          {
            vault_address: DEV_BORING_VAULT,
            shares_held: fundedBaseUnits,
            current_rate: '1000000000000000000',
            current_value_assets: fundedBaseUnits,
            current_value_usd: fundedUsd,
            cost_basis_assets: fundedBaseUnits,
            cost_basis_usd: fundedUsd,
            realized_interest_usd: '0',
            unrealised_interest_usd: '0',
            lifetime_interest_usd: '0',
            current_apy: '0.05',
            effective_apy: '0.05',
          },
        ],
        balance: {
          musd_balance: '0',
          vmusd_value_in_musd: fundedBaseUnits,
          total_balance: fundedBaseUnits,
        },
      },
    }));
}

async function mockMoneyAccountApis(
  mockServer: Mockttp,
  fundedBaseUnits: string,
) {
  const fundedUsd = (Number(fundedBaseUnits) / 1e6).toString();
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('money.api.cx.metamask.io') && isPositionsPath(url);
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        address: DEFAULT_FIXTURE_ACCOUNT,
        as_of_block: 1234568,
        as_of_timestamp: new Date().toISOString(),
        data_freshness: 'live',
        indexer_lag_seconds: 0,
        positions: [
          {
            vault_address: DEV_BORING_VAULT,
            shares_held: fundedBaseUnits,
            current_rate: '1000000000000000000',
            current_value_assets: fundedBaseUnits,
            current_value_usd: fundedUsd,
            cost_basis_assets: fundedBaseUnits,
            cost_basis_usd: fundedUsd,
            realized_interest_usd: '0',
            unrealised_interest_usd: '0',
            lifetime_interest_usd: '0',
            current_apy: '0.05',
            effective_apy: '0.05',
          },
        ],
      },
    }));
}

async function mockMoneyAccountInterest(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1003)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return (
        url.includes('money.api.cx.metamask.io') && url.includes('/interest')
      );
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        vault_address: DEV_BORING_VAULT,
        address: DEFAULT_FIXTURE_ACCOUNT,
        as_of_block: 1234568,
        as_of_timestamp: new Date().toISOString(),
        data_freshness: 'live',
        indexer_lag_seconds: 0,
        window: 'since_inception',
        window_start: new Date().toISOString(),
        window_end: new Date().toISOString(),
        interest_earned_assets: '0',
        interest_earned_usd: '0',
        method: 'time_weighted',
      },
    }));
}

async function mockVedaApy(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('api.sevenseas.capital');
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        Response: {
          apy: 0.04,
          timestamp: new Date().toISOString(),
        },
      },
    }));
}

async function mockTokenApiMetadata(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('token.api.cx.metamask.io/token/');
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: {},
    }));

  await mockServer
    .forGet(/^https:\/\/token\.api\.cx\.metamask\.io\/token\/\d+(\?.*)?$/)
    .asPriority(1000)
    .thenCallback(() => ({
      statusCode: 200,
      json: {},
    }));
}

async function mockMainnetSentinel(mockServer: Mockttp) {
  await mockServer
    .forPost('https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/')
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
        url?.includes('tx-sentinel-ethereum-mainnet.api.cx.metamask.io'),
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
            result: { uuid: 'mocked-uuid-1234' },
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

async function mockMonadSentinel(mockServer: Mockttp) {
  const relayUuid = 'mocked-monad-uuid-1234';

  const simulateResult = (body: Record<string, unknown>) => {
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
  };

  await mockServer
    .forPost('https://tx-sentinel-monad-mainnet.api.cx.metamask.io/')
    .asPriority(1001)
    .thenCallback(async (request) => {
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
            result: { uuid: relayUuid },
          },
        };
      }
      return { statusCode: 200, json: { status: 'ok' } };
    });

  await mockServer
    .forPost('/proxy')
    .asPriority(1002)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url?.includes('tx-sentinel-monad-mainnet.api.cx.metamask.io'),
      );
    })
    .thenCallback(async (request) => {
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
            result: { uuid: relayUuid },
          },
        };
      }
      return { statusCode: 200, json: { status: 'ok' } };
    });

  const statusHandler = () => ({
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
      `https://tx-sentinel-monad-mainnet.api.cx.metamask.io/smart-transactions/${relayUuid}`,
    )
    .asPriority(1001)
    .thenCallback(statusHandler);

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes(
        `tx-sentinel-monad-mainnet.api.cx.metamask.io/smart-transactions/${relayUuid}`,
      );
    })
    .thenCallback(statusHandler);
}

async function mockSentinelNetworks(mockServer: Mockttp) {
  const withMonadRelay = {
    ...TX_SENTINEL_NETWORKS_MAP,
    '143': {
      ...TX_SENTINEL_NETWORKS_MAP['143'],
      relayTransactions: true,
    },
  };

  const handler = () => ({
    statusCode: 200,
    json: withMonadRelay,
  });

  await mockServer
    .forGet('https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks')
    .asPriority(1001)
    .thenCallback(handler);

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
      'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/smart-transactions/mocked-uuid-1234',
    )
    .asPriority(1001)
    .thenCallback(handler);

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes(
        'tx-sentinel-ethereum-mainnet.api.cx.metamask.io/smart-transactions/mocked-uuid-1234',
      );
    })
    .thenCallback(handler);
}

function zeroedPrice(id: string, price: number, usd: number, eth: number) {
  return {
    id,
    price,
    usd,
    eth,
    marketCap: 1,
    pricePercentChange1h: 0,
    pricePercentChange1d: 0,
    pricePercentChange7d: 0,
    pricePercentChange14d: 0,
    pricePercentChange30d: 0,
    pricePercentChange200d: 0,
    pricePercentChange1y: 0,
  };
}

function extraSpotPrices(isUsd: boolean): Record<string, unknown> {
  return {
    'eip155:42161/slip44:60': zeroedPrice(
      'eip155:42161/slip44:60',
      isUsd ? 3000.0 : 1.0,
      3000.0,
      1.0,
    ),
    'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831':
      zeroedPrice(
        'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        isUsd ? 1.0 : 1 / 3000.0,
        1.0,
        1 / 3000.0,
      ),
    'eip155:137/slip44:60': zeroedPrice('eip155:137/slip44:60', 1.0, 1.0, 1.0),
    'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174': zeroedPrice(
      'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      1.0,
      1.0,
      1.0,
    ),
  };
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
            'eip155:143/slip44:60': {
              id: 'eip155:143/slip44:60',
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
            'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
              id: 'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
              price: isUsd ? 1.0 : 1 / 3000.0,
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
            },
            ...extraSpotPrices(isUsd),
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
            USDC: { USD: 1 },
            USD: { USD: 1 },
          },
        };
      }

      if (requestUrl.includes('min-api.cryptocompare.com/data/price')) {
        return {
          statusCode: 200,
          json: {
            USD: 3000,
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
          'eip155:143/slip44:60': {
            id: 'eip155:143/slip44:60',
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
          'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
            id: 'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            price: isUsd ? 1.0 : 1 / 3000.0,
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
          },
          ...extraSpotPrices(isUsd),
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
        eth: {
          name: 'Ether',
          ticker: 'eth',
          value: 1 / 3000.0,
          currencyType: 'crypto',
        },
      },
    }));

  await mockServer
    .forGet(/^https:\/\/min-api\.cryptocompare\.com\/data\/pricemulti\?.*$/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        ETH: { USD: 3000 },
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
        USD: 3000,
      },
    }));
}

async function mockAccountsApiTransactions(
  mockServer: Mockttp,
  amountBaseUnits: string,
) {
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
          chainId: 143,
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
          transactionType: 'withdraw',
          transactionCategory: 'money',
          valueTransfers: [
            {
              from: DEFAULT_FIXTURE_ACCOUNT,
              to: DEFAULT_FIXTURE_ACCOUNT,
              amount: amountBaseUnits,
              decimal: 6,
              contractAddress: MUSD_MONAD,
              symbol: 'mUSD',
              name: 'mUSD',
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

async function mockAccountsApiActiveNetworks(mockServer: Mockttp) {
  const handler = () => ({
    statusCode: 200,
    json: {
      activeNetworks: [
        `eip155:1:${DEFAULT_FIXTURE_ACCOUNT}`,
        `eip155:143:${DEFAULT_FIXTURE_ACCOUNT}`,
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
    .forGet(
      /^https:\/\/accounts\.api\.cx\.metamask\.io\/v2\/activeNetworks(\?.*)?$/,
    )
    .asPriority(1001)
    .thenCallback(handler);
}

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

async function mockMonadTokenApi(mockServer: Mockttp) {
  await mockServer
    .forGet(
      /^https:\/\/token\.api\.cx\.metamask\.io\/token\/143\?.*address=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    )
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        address: MUSD_MONAD,
        symbol: 'mUSD',
        decimals: 6,
        name: 'mUSD',
      },
    }));
}
