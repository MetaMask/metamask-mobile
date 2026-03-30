/**
 * Mock responses for custom RPC provider endpoints (e.g. eth.llamarpc.com)
 * that are not covered by Infura mocks.
 */

import type { Mockttp } from 'mockttp';
import type { TestSpecificMock } from '../../framework';

// Ethereum mainnet block-like response
const MOCK_BLOCK = {
  number: '0x178a60b',
  hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
  gasLimit: '0x1c9c380',
  gasUsed: '0x5208',
  transactions: [],
};

// Method-specific mock responses for Ethereum mainnet RPC calls
const MOCK_RESPONSES: Record<string, unknown> = {
  eth_blockNumber: '0x178a60b',
  net_version: '1',
  eth_chainId: '0x1',
  eth_getBlockByNumber: MOCK_BLOCK,
  eth_call:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  eth_getBalance: '0x0',
  eth_getTransactionCount: '0x0',
  eth_gasPrice: '0x3b9aca00',
  eth_estimateGas: '0x5208',
};

const LLAMARPC_URL = 'https://eth.llamarpc.com';

/**
 * TestSpecificMock that intercepts eth.llamarpc.com RPC calls
 * through the mobile proxy, returning static responses per JSON-RPC method.
 */
export const CUSTOM_RPC_PROVIDER_MOCKS: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(urlParam?.startsWith(LLAMARPC_URL));
    })
    .asPriority(1000)
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : undefined;
        const method = body?.method as string | undefined;
        const result = method ? (MOCK_RESPONSES[method] ?? '0x') : '0x';

        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body?.id ?? 1,
            jsonrpc: '2.0',
            result,
          }),
        };
      } catch {
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
};
