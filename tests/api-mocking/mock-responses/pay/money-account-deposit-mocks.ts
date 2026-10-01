import type { Mockttp } from 'mockttp';
import {
  buildRelayQuoteMock,
  mockRelayQuoteWith,
  mockRelayStatusSuccess,
} from './relay-mocks';
import { TX_SENTINEL_NETWORKS_MAP } from '../tx-sentinel-networks-map';
import { USDC_MAINNET } from '../../../constants/musd-mainnet';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder';

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

/**
 * Empty positions document accepted by
 * `@metamask/money-account-api-data-service` 2.x. `balance` is optional; when
 * present it must include `by_asset` and `total_balance_usd`.
 */
function emptyPositionsResponse(includeBalance: boolean) {
  return {
    address: DEFAULT_FIXTURE_ACCOUNT,
    as_of_block: 1234568,
    as_of_timestamp: new Date().toISOString(),
    data_freshness: 'live' as const,
    indexer_lag_seconds: 0,
    positions: [],
    ...(includeBalance
      ? {
          balance: {
            musd_balance: '0',
            vmusd_value_in_musd: '0',
            total_balance: '0',
            total_balance_usd: '0',
            by_asset: [],
          },
        }
      : {}),
  };
}

export async function mockMoneyAccountApis(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('money.api.cx.metamask.io/v1/positions');
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: emptyPositionsResponse(false),
    }));
}

export async function MONEY_ACCOUNT_DEPOSIT_MOCKS(
  mockServer: Mockttp,
  sourceToken: 'usdc' | 'eth' = 'usdc',
  recipient?: string,
) {
  await mockMoneyAccountBalance(mockServer);
  await mockTokenApiMetadata(mockServer);
  await mockMainnetTokenApi(mockServer);
  await mockMonadTokenApi(mockServer);
  await mockMainnetRpc(mockServer);
  await mockMonadRpc(mockServer);
  await mockMainnetSentinel(mockServer);
  await mockMonadSentinel(mockServer);
  await mockSentinelNetworks(mockServer);
  await mockRelaySubmissionStatus(mockServer);
  await mockPriceApis(mockServer);
  await mockAccountsApiTransactions(mockServer);
  await mockAccountsApiActiveNetworks(mockServer);
  await mockMoneyAccountApis(mockServer);

  const isEthSource = sourceToken === 'eth';
  const quote = buildRelayQuoteMock({
    srcChainId: 1,
    srcToken: isEthSource
      ? {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
        }
      : {
          address: USDC_MAINNET,
          symbol: 'USDC',
          decimals: 6,
        },
    dstChainId: 143,
    dstToken: {
      address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      symbol: 'mUSD',
      decimals: 6,
    },
    amountIn: isEthSource ? '16666666666666666' : '50000000',
    amountOut: '50000000',
    amountUsd: '50.00',
    timeEstimate: 15,
    recipient,
  });

  await mockRelayQuoteWith(mockServer, quote);
  await mockRelayStatusSuccess(mockServer);
}

function isExactMainnetRpcUrl(url: string | null): boolean {
  // Other Infura hosts contain "mainnet.infura.io" (polygon-mainnet, and so on).
  return Boolean(
    url?.includes('://mainnet.infura.io/') || url?.includes('eth.llamarpc.com'),
  );
}

const MAINNET_DEPOSIT_RPC_METHODS = new Set([
  'eth_blockNumber',
  'eth_chainId',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'net_version',
]);

function isMainnetBalanceRead(call: Record<string, unknown>): boolean {
  if (call?.method === 'eth_getBalance') {
    return true;
  }
  if (call?.method !== 'eth_call') {
    return false;
  }
  const params = call.params as { data?: string }[] | undefined;
  return (params?.[0]?.data?.toLowerCase() ?? '').startsWith('0x70a08231');
}

async function mockMainnetRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    // Above the holdings balance mock (1002) so a batch that mixes a balance
    // read with eth_getBlockByNumber is not answered entirely as `0x0`.
    // Pure balance reads are left to that mock.
    .asPriority(1004)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url');
      if (!isExactMainnetRpcUrl(url)) return false;

      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const calls = (Array.isArray(body) ? body : [body]) as Record<
          string,
          unknown
        >[];
        return (
          calls.some((call) =>
            MAINNET_DEPOSIT_RPC_METHODS.has(String(call?.method)),
          ) && !calls.every(isMainnetBalanceRead)
        );
      } catch {
        return false;
      }
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as
        | Record<string, unknown>
        | Record<string, unknown>[];

      if (Array.isArray(body)) {
        return {
          statusCode: 200,
          json: body.map((call) => ({
            jsonrpc: '2.0',
            id: call?.id ?? 1,
            result: resolveMainnetDepositRpc(call),
          })),
        };
      }

      return {
        statusCode: 200,
        json: {
          id: body?.id ?? 1,
          jsonrpc: '2.0',
          result: resolveMainnetDepositRpc(body),
        },
      };
    });
}

const UINT256_ZERO =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const UINT256_MAX =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const UINT8_SIX =
  '0x0000000000000000000000000000000000000000000000000000000000000006';
const ERC20_BALANCE_OF_SELECTOR = '0x70a08231';
const ERC20_ALLOWANCE_SELECTOR = '0xdd62ed3e';
const ERC20_DECIMALS_SELECTOR = '0x313ce567';
const MULTICALL3_AGGREGATE3_SELECTOR = '0x82ad56cb';

const MAINNET_TX_HASH =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const ONE_ETH_WEI = '0xde0b6b3a7640000';
const USDC_BALANCE_500 =
  '0x000000000000000000000000000000000000000000000000000000001dcd6500';

function mainnetSuccessReceipt(hash: string) {
  return {
    transactionHash: hash,
    transactionIndex: '0x0',
    blockNumber: '0x1234568',
    blockHash:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    from: DEFAULT_FIXTURE_ACCOUNT,
    to: DEFAULT_FIXTURE_ACCOUNT,
    cumulativeGasUsed: '0x94670',
    gasUsed: '0x94670',
    contractAddress: null,
    logs: [],
    status: '0x1',
    logsBloom:
      '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  };
}

function resolveMainnetDepositRpc(body: Record<string, unknown>): unknown {
  const method = body?.method as string | undefined;
  const params = body?.params as unknown[] | undefined;
  const requestedHash =
    typeof params?.[0] === 'string' ? params[0] : MAINNET_TX_HASH;

  switch (method) {
    case 'eth_getTransactionReceipt':
      return mainnetSuccessReceipt(requestedHash);
    case 'eth_getTransactionByHash':
      return {
        hash: requestedHash,
        blockNumber: '0x1234568',
        blockHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        transactionIndex: '0x0',
        from: DEFAULT_FIXTURE_ACCOUNT,
        to: DEFAULT_FIXTURE_ACCOUNT,
        value: '0x0',
        input: '0x',
        nonce: '0x1',
        gas: '0x186a0',
        gasPrice: '0x3b9aca00',
      };
    case 'eth_sendRawTransaction':
    case 'eth_sendTransaction':
      return MAINNET_TX_HASH;
    case 'eth_chainId':
      return '0x1';
    case 'net_version':
      return '1';
    case 'eth_blockNumber':
      return '0x1234568';
    case 'eth_getTransactionCount':
      return '0x1';
    case 'eth_estimateGas':
      return '0x186a0';
    case 'eth_gasPrice':
    case 'eth_maxPriorityFeePerGas':
      return '0x3b9aca00';
    case 'eth_getBlockByNumber':
      // A type-2 funding transfer reads baseFeePerGas. The default Infura
      // stub returns `0x0` for this method, which fails the transfer.
      return {
        number: '0x1234568',
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        parentHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        gasLimit: '0x1c9c380',
        gasUsed: '0x94670',
        baseFeePerGas: '0x989680',
        timestamp: '0x68c0c0c0',
      };
    case 'eth_feeHistory':
      return {
        oldestBlock: '0x1234568',
        baseFeePerGas: ['0x989680', '0x989680'],
        gasUsedRatio: [0.5],
        reward: [['0x3b9aca00']],
      };
    case 'eth_getCode':
      return '0x';
    case 'eth_getBalance':
      return ONE_ETH_WEI;
    case 'eth_call': {
      const call = params?.[0] as { data?: string; to?: string } | undefined;
      const data = call?.data?.toLowerCase() ?? '';
      if (
        data.startsWith(ERC20_BALANCE_OF_SELECTOR) &&
        call?.to?.toLowerCase() === USDC_MAINNET.toLowerCase()
      ) {
        return USDC_BALANCE_500;
      }
      return UINT256_ZERO;
    }
    default:
      return '0x';
  }
}

// Multicall3 aggregate3 returns a dynamic tuple(bool success, bytes returnData)[];
// a flat 32-byte zero cannot be decoded, so the array must be encoded for the exact
// number of sub-calls (N, read from the request calldata) with each returnData empty.
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

function resolveMonadRpcResult(body: Record<string, unknown>): unknown {
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
      // Non-atomic Max deposits resolve the settled amount from the mUSD
      // Transfer log in this receipt (getTransferredAmountFromTxHash). The
      // recipient is the deterministic e2e Money Account address.
      logs: [
        {
          address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            '0x00000000000000000000000088e4c776e4598b098022c253159d5804d45ceca8',
          ],
          data: '0x0000000000000000000000000000000000000000000000000000000002faf080',
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
    const data = String((body?.params as Record<string, string>[])?.[0]?.data);
    const selector = data.slice(0, 10);
    switch (selector) {
      case ERC20_ALLOWANCE_SELECTOR:
        return UINT256_MAX;
      case ERC20_DECIMALS_SELECTOR:
        return UINT8_SIX;
      case MULTICALL3_AGGREGATE3_SELECTOR:
        return encodeAggregate3Result(data);
      case ERC20_BALANCE_OF_SELECTOR:
      default:
        return UINT256_ZERO;
    }
  }

  if (method === 'eth_getTransactionCount') {
    return '0x0';
  }
  if (method === 'eth_gasPrice' || method === 'eth_estimateGas') {
    return '0x3b9aca00';
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

function isMonadRpcRequest(url: string | null, port: number): boolean {
  return Boolean(url?.includes('monad')) || String(port) === '8546';
}

async function mockMonadRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      // The Monad network client's RPC is the disabled local node (localhost:8546),
      // so its proxied calls carry that host rather than a monad hostname.
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

async function mockMoneyAccountBalance(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1002)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('money.api.cx.metamask.io/v1/positions');
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: emptyPositionsResponse(true),
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
  // The relay deposit is submitted on the SOURCE chain (Mainnet, chainId 1),
  // so sentinel calls target tx-sentinel-ethereum-mainnet.
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
          transactionType: 'deposit',
          transactionCategory: 'money',
          valueTransfers: [
            {
              from: DEFAULT_FIXTURE_ACCOUNT,
              to: DEFAULT_FIXTURE_ACCOUNT,
              amount: '50000000',
              decimal: 6,
              contractAddress: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
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
        address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
        symbol: 'mUSD',
        decimals: 6,
        name: 'mUSD',
      },
    }));
}
