/* eslint-disable no-console */
/**
 * Arbitrum RPC Mocks for Perps E2E Testing
 *
 * Mocks Arbitrum network calls to return static data quickly,
 * preventing long-running network requests that block Detox.
 */

// Static mock responses for Arbitrum RPC calls
const MOCK_RESPONSES = {
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
    <circle cx="12" cy="12" r="10" fill="#e0e0e0"/>
    <text x="12" y="16" text-anchor="middle" font-size="12" fill="#666">$</text>
  </svg>`;

/**
 * TestSpecificMock function for Perps testing
 * Sets up mocks to prevent live network requests to Arbitrum during E2E tests
 */
export const PERPS_ARBITRUM_MOCKS = async (mockServer) => {
  const { setupMockRequest } = await import('../helpers/mockHelpers');

  // Mock Arbitrum RPC endpoint
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: 'https://arb1.arbitrum.io/rpc',
    response: (request) => {
      try {
        const body = JSON.parse(request.body);
        console.log(
          '[Perps E2E Mock] Intercepted Arbitrum RPC call:',
          body.method,
        );

        // Handle batch requests
        if (Array.isArray(body)) {
          return {
            body: JSON.stringify(
              body.map((req) => ({
                id: req.id,
                jsonrpc: '2.0',
                result: MOCK_RESPONSES[req.method] || '0x',
              })),
            ),
          };
        }

        // Handle single requests
        const method = body.method;
        const result = MOCK_RESPONSES[method] || '0x';

        return {
          body: JSON.stringify({
            id: body.id,
            jsonrpc: '2.0',
            result,
          }),
        };
      } catch (error) {
        console.log('[Perps E2E Mock] Error parsing request body:', error);
        return {
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            result: '0x',
          }),
        };
      }
    },
    responseCode: 200,
  });

  // Mock HyperLiquid coin image requests
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/app\.hyperliquid\.xyz\/coins\/.*\.svg$/,
    response: () => {
      console.log(
        '[Perps E2E Mock] Intercepted HyperLiquid coin image request',
      );
      return {
        body: MOCK_COIN_SVG,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      };
    },
    responseCode: 200,
  });
};
