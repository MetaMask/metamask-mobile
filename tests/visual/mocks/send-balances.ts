import type { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { getDecodedProxiedURL } from '../../smoke/notifications/utils/helpers';

// Default fixture account address (lowercase, matching existing send tests)
const DEFAULT_ACCOUNT = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';

// 10 ETH — matches the fixture patch in presets.ts and the send-erc20 test
const ETH_BALANCE = '10.000000000000000000';
const ETH_BALANCE_WEI_HEX = '0x8AC7230489E80000'; // 10 ETH in wei

/**
 * Visual-test-specific mock that overrides Accounts API balance endpoints
 * and mainnet RPC to return consistent 10 ETH balance.
 *
 * Pattern is taken directly from the working send-erc20-token.spec.ts test.
 * The `assetsAccountApiBalances` feature flag (active in prod) causes the app
 * to fetch balances from the Accounts API instead of local fixture state.
 * Without these mocks, ETH does not appear in the wallet home token list.
 *
 * Priority 1000 ensures these override the default mock rules (priority 999).
 */
export async function setupSendBalancesMock(server: Mockttp): Promise<void> {
  // --- Accounts API V4 (multi-account balances) ---
  // Uses flat array format matching the working send-erc20-token.spec.ts
  await setupMockRequest(
    server,
    {
      requestMethod: 'GET',
      url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
      response: {
        balances: [
          {
            object: 'token',
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ether',
            type: 'native',
            decimals: 18,
            chainId: 1,
            balance: ETH_BALANCE,
            accountAddress: `eip155:1:${DEFAULT_ACCOUNT}`,
          },
        ],
        unprocessedNetworks: [],
      },
      responseCode: 200,
    },
    1000,
  );

  // --- Accounts API V2 (single-account balances) ---
  await setupMockRequest(
    server,
    {
      requestMethod: 'GET',
      url: /accounts\.api\.cx\.metamask\.io\/v2\/accounts\/[^/]+\/balances/,
      response: {
        count: 1,
        balances: [
          {
            object: 'token',
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ether',
            type: 'native',
            timestamp: '2015-07-30T15:26:13.000Z',
            decimals: 18,
            chainId: 1,
            balance: '10.0',
          },
        ],
        unprocessedNetworks: [],
      },
      responseCode: 200,
    },
    1000,
  );

  // --- Mainnet RPC mocks (Infura) ---
  // The app queries Infura for on-chain data. Without these mocks, RPC calls
  // go to live Infura and return 0 balance for our fixture account.
  const MAINNET_RPC_RESPONSES: Record<string, unknown> = {
    eth_chainId: '0x1',
    eth_getBalance: ETH_BALANCE_WEI_HEX,
    eth_call: '0x',
    eth_estimateGas: '0xCAFE',
    eth_gasPrice: '0x3B9ACA00',
    eth_getTransactionCount: '0x0',
    eth_blockNumber: '0x1234567',
    eth_getBlockByNumber: {
      number: '0x1234567',
      hash: '0xabc123',
      timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
      gasLimit: '0x1c9c380',
      gasUsed: '0x5208',
      baseFeePerGas: '0x3B9ACA00',
      transactions: [],
    },
    eth_maxPriorityFeePerGas: '0x3B9ACA00',
    eth_feeHistory: {
      baseFeePerGas: ['0x3B9ACA00', '0x3B9ACA00'],
      gasUsedRatio: [0.5],
      oldestBlock: '0x1234566',
      reward: [['0x3B9ACA00']],
    },
    net_version: '1',
  };

  const createMainnetRpcCallback =
    () =>
    async (request: {
      body: { getText: () => Promise<string | undefined> };
    }) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : null;

        if (Array.isArray(body)) {
          const results = body.map((req: { id?: number; method?: string }) => ({
            id: req.id ?? 1,
            jsonrpc: '2.0',
            result: MAINNET_RPC_RESPONSES[req.method ?? ''] ?? '0x',
          }));
          return { statusCode: 200, body: JSON.stringify(results) };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body?.id ?? 1,
            jsonrpc: '2.0',
            result: MAINNET_RPC_RESPONSES[body?.method ?? ''] ?? '0x',
          }),
        };
      } catch {
        return {
          statusCode: 200,
          body: JSON.stringify({ id: 1, jsonrpc: '2.0', result: '0x' }),
        };
      }
    };

  // --- Spot price mocks (override defaults that return price: 1.0) ---
  // v3 spot-prices (used by multi-chain price fetcher)
  await setupMockRequest(
    server,
    {
      requestMethod: 'GET',
      url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/,
      response: {
        'eip155:1/slip44:60': {
          usd: 4280.15,
          eth: 1.0,
        },
      },
      responseCode: 200,
    },
    1000,
  );

  // v2 chain spot-prices (used by per-chain price fetcher)
  await setupMockRequest(
    server,
    {
      requestMethod: 'GET',
      url: /price\.api\.cx\.metamask\.io\/v2\/chains\/\d+\/spot-prices/,
      response: {
        '0x0000000000000000000000000000000000000000': {
          id: 'ethereum',
          price: 4280.15,
          marketCap: 500000000000,
          allTimeHigh: 4891.7,
          allTimeLow: 0.43,
          totalVolume: 15000000000,
          high1d: 4300.0,
          low1d: 4250.0,
          circulatingSupply: 120000000,
          dilutedMarketCap: 500000000000,
          marketCapPercentChange1d: 0,
          priceChange1d: 0,
          pricePercentChange1h: 0,
          pricePercentChange1d: 0,
          pricePercentChange7d: 0,
          pricePercentChange14d: 0,
          pricePercentChange30d: 0,
          pricePercentChange200d: 0,
          pricePercentChange1y: 0,
        },
      },
      responseCode: 200,
    },
    1000,
  );

  // CryptoCompare (fallback price source)
  await setupMockRequest(
    server,
    {
      requestMethod: 'GET',
      url: /min-api\.cryptocompare\.com\/data\/pricemulti/,
      response: {
        ETH: { USD: 4280.15 },
      },
      responseCode: 200,
    },
    1000,
  );

  // Direct Infura requests
  await server
    .forPost(/^https:\/\/mainnet\.infura\.io\/v3\/.*$/)
    .asPriority(1000)
    .thenCallback(createMainnetRpcCallback());

  // Proxied Infura requests (through MockServerE2E proxy)
  await server
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('mainnet.infura.io');
    })
    .asPriority(1000)
    .thenCallback(createMainnetRpcCallback());
}
