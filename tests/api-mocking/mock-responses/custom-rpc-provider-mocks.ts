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

// Shared method-specific mock responses applied to all proxied RPC hosts
const SHARED_MOCK_RESPONSES: Record<string, unknown> = {
  eth_blockNumber: '0x178a60b',
  eth_getBlockByNumber: MOCK_BLOCK,
  eth_call:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  eth_getBalance: '0x0',
  eth_getTransactionCount: '0x0',
  eth_gasPrice: '0x3b9aca00',
  eth_estimateGas: '0x5208',
};

// Per-host overrides ensure each mocked RPC reports the correct chain identity
// (returning Ethereum mainnet values for non-mainnet hosts can mask chain-switch bugs).
const PROXIED_RPC_CONFIGS: {
  url: string;
  chainId: string;
  netVersion: string;
}[] = [
  { url: 'https://eth.llamarpc.com', chainId: '0x1', netVersion: '1' },
  {
    url: 'https://rpc.atlantischain.network',
    chainId: '0x53a',
    netVersion: '1338',
  },
];

const findRpcConfig = (urlParam: string | null) =>
  PROXIED_RPC_CONFIGS.find((config) => urlParam?.startsWith(config.url));

/**
 * TestSpecificMock that intercepts custom-RPC provider calls
 * (eth.llamarpc.com, rpc.atlantischain.network) through the mobile
 * proxy, returning static responses per JSON-RPC method.
 */
export const CUSTOM_RPC_PROVIDER_MOCKS: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(findRpcConfig(urlParam));
    })
    .asPriority(1000)
    .thenCallback(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      const rpcConfig = findRpcConfig(urlParam);

      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : undefined;
        const method = body?.method as string | undefined;

        let result: unknown = '0x';
        if (method === 'eth_chainId') {
          result = rpcConfig?.chainId ?? '0x1';
        } else if (method === 'net_version') {
          result = rpcConfig?.netVersion ?? '1';
        } else if (method) {
          result = SHARED_MOCK_RESPONSES[method] ?? '0x';
        }

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
