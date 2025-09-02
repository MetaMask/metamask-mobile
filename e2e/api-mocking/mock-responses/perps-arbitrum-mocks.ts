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

  // eth_call - contract calls (return empty data)
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

  // Mock Arbitrum RPC endpoint through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(urlParam?.includes(ARBITRUM_RPC_URL));
    })
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : undefined;

        console.log('[Perps E2E Mock] Intercepted Arbitrum RPC call');

        // Handle batch requests
        if (Array.isArray(body)) {
          const results = body.map((req) => ({
            id: req.id,
            jsonrpc: '2.0',
            result:
              (MOCK_RESPONSES as Record<string, unknown>)[req.method] || '0x',
          }));

          return {
            statusCode: 200,
            body: JSON.stringify(results),
          };
        }

        // Handle single requests
        const method = body?.method as string | undefined;
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
};
