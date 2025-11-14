/* eslint-disable no-console */
/**
 * Arbitrum RPC Mocks for Perps E2E Testing
 *
 * Mocks Arbitrum network calls to return static data quickly,
 * preventing long-running network requests that block Detox.
 */

import type { Mockttp } from 'mockttp';
import type { TestSpecificMock } from '../../framework';

// Static mock responses for Arbitrum RPC calls
const MOCK_RESPONSES: Record<string, unknown> = {
  // eth_chainId
  eth_chainId: '0xa4b1', // Arbitrum One chain ID

  // eth_getBalance - mock balance
  eth_getBalance: '0x0', // 0 ETH balance

  // eth_call - contract calls (dinamically overridden in tests)
  eth_call: '0x',

  // eth_estimateGas - gas estimation
  eth_estimateGas: '0x5208', // 21000 gas

  // eth_gasPrice - gas price
  eth_gasPrice: '0x9c7652400', // 42 gwei

  // eth_getTransactionCount - nonce
  eth_getTransactionCount: '0x0',

  // eth_blockNumber - latest block
  eth_blockNumber: '0x1234567',

  // eth_getBlockByNumber - block data
  eth_getBlockByNumber: {
    number: '0x1234567',
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
    gasLimit: '0x1c9c380',
    gasUsed: '0x5208',
    transactions: [],
  },

  // net_version
  net_version: '42161', // Arbitrum One network ID
};

/**
 * Simple SVG placeholder for coin images in E2E tests
 */
const MOCK_COIN_SVG = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="lightgray"/>
    <text x="12" y="16" text-anchor="middle" font-size="12" fill="gray">$</text>
  </svg>`;

/**
 * TestSpecificMock function for Perps testing
 * Sets up mocks to prevent live network requests to Arbitrum during E2E tests
 */
export const PERPS_ARBITRUM_MOCKS: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';
  const USDC_ARBITRUM_E = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'; // USDC.e (legacy)
  const USDC_ARBITRUM = '0xaf88d065e77c8cc2239327c5edb3a432268e5831'; // Native USDC
  // Encode balanceOf(Account1) result for 200 USDC (6 decimals) => 200000000
  const TWO_HUNDRED_USDC_HEX =
    '0x000000000000000000000000000000000000000000000000000000000bebc200';
  // 100 ETH in wei
  const HUNDRED_ETH_WEI_HEX = '0x56bc75e2d63100000';

  // Mock Arbitrum RPC endpoint through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(urlParam?.includes(ARBITRUM_RPC_URL));
    })
    .asPriority(1000)
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : undefined;

        console.log('[Perps E2E Mock] Intercepted Arbitrum RPC call');

        // Handle batch requests
        if (Array.isArray(body)) {
          const results = body.map((req) => {
            // Special-case eth_getBalance in batch
            if (req.method === 'eth_getBalance') {
              return {
                id: req.id,
                jsonrpc: '2.0',
                result: HUNDRED_ETH_WEI_HEX,
              };
            }
            return {
              id: req.id,
              jsonrpc: '2.0',
              result:
                (MOCK_RESPONSES as Record<string, unknown>)[req.method] || '0x',
            };
          });

          return {
            statusCode: 200,
            body: JSON.stringify(results),
          };
        }

        // Handle single requests
        const method = body?.method as string | undefined;

        // Special-case mock for ERC20 balanceOf(USDC, account) used by Pay with
        if (method === 'eth_call') {
          // Extract call data to detect balanceOf(address)
          try {
            interface EthCallArg {
              to?: string;
              data?: string;
            }
            const params = (body as { params?: EthCallArg[] })?.params ?? [];
            const arg0 = (params[0] as EthCallArg | undefined) || undefined;
            const to = arg0?.to?.toLowerCase?.();
            const data: string | undefined = arg0?.data;
            // ERC20 balanceOf selector 0x70a08231
            const isBalanceOf =
              typeof data === 'string' && data.startsWith('0x70a08231');
            if (
              (to === USDC_ARBITRUM || to === USDC_ARBITRUM_E) &&
              isBalanceOf
            ) {
              return {
                statusCode: 200,
                body: JSON.stringify({
                  id: body?.id ?? 1,
                  jsonrpc: '2.0',
                  result: TWO_HUNDRED_USDC_HEX,
                }),
              };
            }
          } catch (e) {
            // fall back
          }
        }

        // Special-case mock for native ETH balance on Arbitrum
        if (method === 'eth_getBalance') {
          return {
            statusCode: 200,
            body: JSON.stringify({
              id: body?.id ?? 1,
              jsonrpc: '2.0',
              result: HUNDRED_ETH_WEI_HEX,
            }),
          };
        }

        const result = method
          ? (MOCK_RESPONSES as Record<string, unknown>)[method] || '0x'
          : '0x';

        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body?.id ?? 1,
            jsonrpc: '2.0',
            result,
          }),
        };
      } catch (error) {
        console.log('[Perps E2E Mock] Error parsing request body:', error);
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            result: '0x',
          }),
        };
      }
    });

  // Mock HyperLiquid coin image requests through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return urlParam
        ? /^https:\/\/app\.hyperliquid\.xyz\/coins\/.*\.svg$/.test(urlParam)
        : false;
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log(
        '[Perps E2E Mock] Intercepted HyperLiquid coin image request',
      );
      return {
        statusCode: 200,
        body: MOCK_COIN_SVG,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      };
    });

  // Mock Accounts API (balances/relationships) through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('accounts.api.cx.metamask.io');
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log('[Perps E2E Mock] Intercepted Accounts API request');
      return {
        statusCode: 200,
        body: JSON.stringify({ data: [], included: [] }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    });

  // Mock Token API metadata through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('token.api.cx.metamask.io/token/42161');
    })
    .asPriority(1000)
    .thenCallback((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      const url = new URL(urlParam);
      const address = (url.searchParams.get('address') || '').toLowerCase();
      console.log(
        '[Perps E2E Mock] Intercepted Token API request for',
        address,
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          address,
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          chainId: 42161,
          logo: '',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

  // Mock Tx Sentinel POST via mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes(
        'tx-sentinel-arbitrum-mainnet.api.cx.metamask.io',
      );
    })
    .asPriority(1000)
    .thenCallback(async () => {
      console.log('[Perps E2E Mock] Intercepted Tx Sentinel request');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' }),
        headers: { 'Content-Type': 'application/json' },
      };
    });
};
