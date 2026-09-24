import type { Mockttp } from 'mockttp';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../perps-arbitrum-mocks';
import { RampsRegions, RampsRegionsEnum } from '../../../framework/Constants';
import {
  buildRelayQuoteMock,
  mockRelayAuthorize,
  mockRelayQuoteWith,
  mockRelayStatusSuccess,
} from './relay-mocks';
import { TX_SENTINEL_NETWORKS_MAP } from '../tx-sentinel-networks-map';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder';
import { mockMoneyAccountApis } from './money-account-deposit-mocks';
import { MUSD_MAINNET } from '../../../constants/musd-mainnet';

const PERPS_ARBITRUM_USDC = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const PERPS_WITHDRAW_TELLER = '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117';
const PERPS_MONEY_ACCOUNT = '0x88e4c776e4598b098022c253159d5804d45ceca8';
const PERPS_MAINNET_ETH = '0x0000000000000000000000000000000000000000';
const PERPS_MUSD_MONAD = MUSD_MAINNET;

const PERPS_WITHDRAW_AMOUNT_BASE_UNITS = '5000000'; // $5 USDC at 6 decimals
const PERPS_WITHDRAW_ETH_OUT = '1666666666666667'; // ~$5 at $3000/ETH
const PERPS_WITHDRAW_TX_HASH =
  '0xperpswd1234567890abcdef1234567890abcdef1234567890abcdef12345678';
const PERPS_MONEY_DEPOSIT_TX_HASH =
  '0xperpsmon1234567890abcdef1234567890abcdef1234567890abcdef12345678';

const PERPS_SOURCE_CHAIN_ID = 42161;
const MONAD_CHAIN_ID = 143;

export async function PERPS_WITHDRAW_MOCKS(mockServer: Mockttp) {
  await setupCommonPerpsWithdrawMocks(mockServer, {
    smartTxHash: PERPS_WITHDRAW_TX_HASH,
    relayUuid: 'mocked-perps-withdraw-uuid-1234',
    destinationRecipient: DEFAULT_FIXTURE_ACCOUNT,
    destinationChainId: PERPS_SOURCE_CHAIN_ID,
    destinationTokenAddress: PERPS_MAINNET_ETH,
    destinationTokenSymbol: 'ETH',
    destinationTokenDecimals: 18,
    destinationAmountOut: PERPS_WITHDRAW_ETH_OUT,
    destinationAmountUsd: '5.00',
  });
}

export async function PERPS_WITHDRAW_TO_MONEY_ACCOUNT_MOCKS(
  mockServer: Mockttp,
) {
  await setupCommonPerpsWithdrawMocks(mockServer, {
    smartTxHash: PERPS_MONEY_DEPOSIT_TX_HASH,
    relayUuid: 'mocked-perps-money-withdraw-uuid-1234',
    destinationRecipient: PERPS_WITHDRAW_TELLER,
    destinationChainId: MONAD_CHAIN_ID,
    destinationTokenAddress: PERPS_MUSD_MONAD,
    destinationTokenSymbol: 'mUSD',
    destinationTokenDecimals: 6,
    destinationAmountOut: PERPS_WITHDRAW_AMOUNT_BASE_UNITS,
    destinationAmountUsd: '5.00',
    includeMoneyAccountMocks: true,
    includeMonadSettlement: true,
  });
}

interface CommonWithdrawOptions {
  smartTxHash: string;
  relayUuid: string;
  destinationRecipient: string;
  destinationChainId: number;
  destinationTokenAddress: string;
  destinationTokenSymbol: string;
  destinationTokenDecimals: number;
  destinationAmountOut: string;
  destinationAmountUsd: string;
  includeMoneyAccountMocks?: boolean;
  includeMonadSettlement?: boolean;
}

async function setupCommonPerpsWithdrawMocks(
  mockServer: Mockttp,
  options: CommonWithdrawOptions,
) {
  await mockHyperLiquidConnection(mockServer);
  await mockHyperLiquidLedger(mockServer);
  await PERPS_ARBITRUM_MOCKS(mockServer);
  await mockPerpsGeolocation(mockServer, RampsRegions[RampsRegionsEnum.FRANCE]);
  await mockArbitrumRpc(mockServer);
  await mockMainnetRpc(mockServer);
  await mockPriceApis(mockServer);
  await mockAccountsApiTransactions(mockServer, options.smartTxHash);
  await mockAccountsApiActiveNetworks(mockServer);
  await mockSentinelNetworks(
    mockServer,
    options.includeMonadSettlement
      ? [PERPS_SOURCE_CHAIN_ID, MONAD_CHAIN_ID]
      : [PERPS_SOURCE_CHAIN_ID],
  );
  await mockArbitrumSentinel(mockServer, options.relayUuid);
  await mockRelayStatusSuccess(mockServer);
  await mockRelayAuthorize(mockServer);

  if (options.includeMoneyAccountMocks) {
    await mockMoneyAccountApis(mockServer);
  }

  if (options.includeMonadSettlement) {
    await mockMonadRpc(mockServer, options.smartTxHash);
    await mockMonadPostRelaySettlement(mockServer, options.relayUuid);
  }

  const quote = buildRelayQuoteMock({
    srcChainId: PERPS_SOURCE_CHAIN_ID,
    srcToken: {
      address: PERPS_ARBITRUM_USDC,
      symbol: 'USDC',
      decimals: 6,
    },
    dstChainId: options.destinationChainId,
    dstToken: {
      address: options.destinationTokenAddress,
      symbol: options.destinationTokenSymbol,
      decimals: options.destinationTokenDecimals,
    },
    amountIn: PERPS_WITHDRAW_AMOUNT_BASE_UNITS,
    amountOut: options.destinationAmountOut,
    amountUsd: options.destinationAmountUsd,
    timeEstimate: 15,
    recipient: options.destinationRecipient,
  });

  // HyperLiquid withdrawals execute via the Relay strategy's 2-step flow
  // (submitHyperliquidWithdraw): an `authorize` signature step (EIP-712
  // nonce-mapping posted to Relay /authorize) followed by a `deposit` step
  // (EIP-712 sendAsset posted to Hyperliquid exchange). The generic bridge
  // quote shape lacks these and makes submission throw.
  quote.steps = [
    {
      id: 'authorize',
      kind: 'signature',
      action: 'Withdraw funds',
      description: 'Perps withdrawal',
      requestId: options.relayUuid,
      items: [
        {
          status: 'incomplete',
          data: {
            sign: {
              domain: {
                name: 'Relay Authorize',
                version: '1',
                chainId: PERPS_SOURCE_CHAIN_ID,
                verifyingContract: '0x0000000000000000000000000000000000000000',
              },
              types: {
                Authorize: [
                  { name: 'nonce', type: 'uint256' },
                  { name: 'address', type: 'address' },
                ],
              },
              primaryType: 'Authorize',
              value: { nonce: '1', address: DEFAULT_FIXTURE_ACCOUNT },
            },
            post: { method: 'POST', body: {} },
          },
        },
      ],
    },
    {
      id: 'deposit',
      kind: 'transaction',
      action: 'Confirm withdrawal on Hyperliquid',
      description: 'Perps withdrawal',
      requestId: options.relayUuid,
      items: [
        {
          status: 'incomplete',
          data: {
            action: {
              type: 'withdraw',
              parameters: {
                destination: options.destinationRecipient,
                amount: options.destinationAmountOut,
              },
            },
            nonce: Date.now(),
            eip712Types: {
              Withdraw: [
                { name: 'destination', type: 'string' },
                { name: 'amount', type: 'string' },
              ],
            },
            eip712PrimaryType: 'Withdraw',
          },
        },
      ],
    },
  ];

  if (quote.details && typeof quote.details === 'object') {
    const details = quote.details as Record<string, unknown>;
    details.operation = 'withdraw';
    details.recipient = options.destinationRecipient;
  }

  await mockRelayQuoteWith(mockServer, quote);

  if (options.includeMonadSettlement) {
    await mockMonadPostRelaySettlement(mockServer, options.relayUuid);
  }
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
    .asPriority(1002)
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
          hash: PERPS_WITHDRAW_TX_HASH,
          time: Date.now(),
          delta: {
            type: 'withdraw',
            usdc: '5',
            coin: 'USDC',
          },
        },
      ],
    }));
}

async function mockArbitrumRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      if (!url.includes('https://arb1.arbitrum.io/rpc')) return false;

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
      if (method === 'eth_chainId') {
        result = '0xa4b1';
      } else if (method === 'net_version') {
        result = '42161';
      } else if (method === 'eth_getTransactionReceipt') {
        const requestedHash =
          (body?.params as string[])?.[0] ?? PERPS_WITHDRAW_TX_HASH;
        result = {
          transactionHash: requestedHash,
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
            '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        };
      } else if (
        method === 'eth_sendRawTransaction' ||
        method === 'eth_sendTransaction'
      ) {
        result = PERPS_WITHDRAW_TX_HASH;
      } else if (method === 'eth_estimateGas') {
        result = '0x493e0';
      } else if (method === 'eth_gasPrice') {
        result = '0x3b9aca00';
      } else if (method === 'eth_getTransactionCount') {
        // Nonce for the EIP-7702 withdraw batch built by addTransactionBatch.
        result = '0x1';
      } else if (method === 'eth_getBlockByNumber') {
        // EIP-1559 block: baseFeePerGas is required, otherwise type-0x4
        // batches fail (same shape as PERPS_ARBITRUM_MOCKS / predict-withdraw-mocks).
        result = {
          number: '0x1234568',
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          parentHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          gasLimit: '0x1c9c380',
          gasUsed: '0x94670',
          baseFeePerGas: '0x989680',
          timestamp: '0x68c0c0c0',
        };
      } else if (method === 'eth_maxPriorityFeePerGas') {
        result = '0x3b9aca00';
      } else if (method === 'eth_feeHistory') {
        result = {
          oldestBlock: '0x1234568',
          baseFeePerGas: ['0x989680', '0x989680'],
          gasUsedRatio: [0.5],
          reward: [['0x3b9aca00']],
        };
      } else if (method === 'eth_blockNumber') {
        result = '0x1234568';
      } else if (method === 'eth_getBalance') {
        result = '0x0';
      } else if (method === 'eth_call') {
        result = '0x';
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

async function mockMainnetRpc(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      if (!url.includes('mainnet.infura.io')) return false;

      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : {};
        return Boolean(body.method);
      } catch {
        return false;
      }
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;
      const method = body?.method as string;

      let result: unknown = '0x';
      if (method === 'eth_chainId') {
        result = '0x1';
      } else if (method === 'net_version') {
        result = '1';
      } else if (method === 'eth_getTransactionReceipt') {
        const requestedHash =
          (body?.params as string[])?.[0] ?? PERPS_WITHDRAW_TX_HASH;
        result = {
          transactionHash: requestedHash,
          transactionIndex: '0x0',
          blockNumber: '0x1234568',
          blockHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          from: DEFAULT_FIXTURE_ACCOUNT,
          to: PERPS_MAINNET_ETH,
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
        result = PERPS_WITHDRAW_TX_HASH;
      } else if (method === 'eth_estimateGas') {
        result = '0x186a0';
      } else if (method === 'eth_gasPrice') {
        result = '0x3b9aca00';
      } else if (method === 'eth_blockNumber') {
        result = '0x1234568';
      } else if (method === 'eth_getBalance') {
        result = '0x0';
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

async function mockMonadRpc(mockServer: Mockttp, settledHash: string) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(url.includes('monad') || url.includes('8546'));
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;
      const method = body?.method as string;

      let result: unknown = '0x';
      if (method === 'eth_chainId') {
        result = '0x8f';
      } else if (method === 'eth_getTransactionReceipt') {
        const requestedHash = (body?.params as string[])?.[0] ?? settledHash;
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
          logs: [
            {
              address: PERPS_MUSD_MONAD,
              topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                `0x000000000000000000000000${PERPS_MONEY_ACCOUNT.slice(2)}`,
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
      } else if (
        method === 'eth_sendRawTransaction' ||
        method === 'eth_sendTransaction'
      ) {
        result = settledHash;
      } else if (method === 'eth_call') {
        result = '0x';
      } else if (method === 'eth_getTransactionCount') {
        result = '0x0';
      } else if (method === 'eth_gasPrice' || method === 'eth_estimateGas') {
        result = '0x3b9aca00';
      } else if (method === 'eth_blockNumber') {
        result = '0x1234568';
      } else if (method === 'eth_getBalance') {
        result = '0x0';
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

async function mockMonadPostRelaySettlement(
  mockServer: Mockttp,
  relayUuid: string,
) {
  const handler = () => ({
    statusCode: 200,
    json: {
      transactions: [
        {
          hash: PERPS_MONEY_DEPOSIT_TX_HASH,
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
    .thenCallback(handler);

  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes(
        `tx-sentinel-monad-mainnet.api.cx.metamask.io/smart-transactions/${relayUuid}`,
      );
    })
    .thenCallback(handler);
}

async function mockArbitrumSentinel(mockServer: Mockttp, relayUuid: string) {
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
            result: { uuid: relayUuid },
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
              id: relayUuid,
            },
            id: body.id,
          },
        };
      }

      return { statusCode: 200, json: { status: 'ok' } };
    });

  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('tx-sentinel-arbitrum-mainnet.api.cx.metamask.io');
    })
    .thenCallback(async (request) => {
      const body = (await request.body.getJson()) as Record<string, unknown>;

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
              id: relayUuid,
            },
            id: body.id,
          },
        };
      }

      return { statusCode: 200, json: { status: 'ok' } };
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
            'eip155:1/slip44:60': {
              id: 'eip155:1/slip44:60',
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
            'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
              id: 'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
              price: 1.0,
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
            musd: {
              name: 'MetaMask USD',
              ticker: 'musd',
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
            ETH: { USD: 3000 },
            USDC: { USD: 1 },
            MUSD: { USD: 1 },
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
          'eip155:1/slip44:60': {
            id: 'eip155:1/slip44:60',
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
          'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
            id: 'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            price: 1.0,
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
        musd: {
          name: 'MetaMask USD',
          ticker: 'musd',
          value: 1,
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
        MUSD: { USD: 1 },
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
  txHash: string,
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
          hash: txHash,
          timestamp: new Date().toISOString(),
          chainId: PERPS_SOURCE_CHAIN_ID,
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
          to: DEFAULT_FIXTURE_ACCOUNT,
          from: DEFAULT_FIXTURE_ACCOUNT,
          isError: false,
          transactionType: 'withdrawal',
          transactionCategory: 'perps',
          valueTransfers: [
            {
              from: DEFAULT_FIXTURE_ACCOUNT,
              to: DEFAULT_FIXTURE_ACCOUNT,
              amount: PERPS_WITHDRAW_AMOUNT_BASE_UNITS,
              decimal: 6,
              contractAddress: PERPS_ARBITRUM_USDC,
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

async function mockAccountsApiActiveNetworks(mockServer: Mockttp) {
  const handler = () => ({
    statusCode: 200,
    json: {
      activeNetworks: [
        `eip155:${PERPS_SOURCE_CHAIN_ID}:${DEFAULT_FIXTURE_ACCOUNT}`,
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

async function mockSentinelNetworks(
  mockServer: Mockttp,
  relayChainIds: number[],
) {
  const withRelay = relayChainIds.reduce<Record<string, unknown>>(
    (acc, chainId) => ({
      ...acc,
      [String(chainId)]: {
        ...(TX_SENTINEL_NETWORKS_MAP[
          String(chainId) as keyof typeof TX_SENTINEL_NETWORKS_MAP
        ] || {}),
        relayTransactions: true,
      },
    }),
    { ...TX_SENTINEL_NETWORKS_MAP },
  );

  const handler = () => ({
    statusCode: 200,
    json: withRelay,
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
