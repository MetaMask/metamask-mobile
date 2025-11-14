/**
 * Mock responses for Infura RPC endpoints
 */

import { MockEventsObject } from '../../framework';

// Common JSON-RPC responses for different methods
const createJsonRpcResponse = (id: number, result: unknown) => ({
  jsonrpc: '2.0',
  id,
  result,
});

// Create mock responses for all Infura endpoints
const createInfuraMocks = () => {
  const mocks: {
    urlEndpoint: string | RegExp;
    requestBody?: unknown;
    responseCode: number;
    response: unknown;
  }[] = [];

  // All Infura endpoints
  const endpoints = [
    'mainnet.infura.io',
    'goerli.infura.io',
    'sepolia.infura.io',
    'arbitrum-mainnet.infura.io',
    'arbitrum-goerli.infura.io',
    'arbitrum-sepolia.infura.io',
    'optimism-mainnet.infura.io',
    'optimism-goerli.infura.io',
    'optimism-sepolia.infura.io',
    'polygon-mainnet.infura.io',
    'polygon-mumbai.infura.io',
    'polygon-amoy.infura.io',
    'linea-mainnet.infura.io',
    'linea-goerli.infura.io',
    'linea-sepolia.infura.io',
    'base-mainnet.infura.io',
    'base-goerli.infura.io',
    'base-sepolia.infura.io',
    'avalanche-mainnet.infura.io',
    'avalanche-fuji.infura.io',
    'bsc-mainnet.infura.io',
    'bsc-testnet.infura.io',
    'celo-mainnet.infura.io',
    'celo-alfajores.infura.io',
    'gnosis-mainnet.infura.io',
    'gnosis-chiado.infura.io',
    'aurora-mainnet.infura.io',
    'aurora-testnet.infura.io',
    'fantom-mainnet.infura.io',
    'fantom-testnet.infura.io',
    'harmony-mainnet.infura.io',
    'harmony-testnet.infura.io',
    'moonbeam-mainnet.infura.io',
    'moonbeam-moonbase.infura.io',
    'moonriver-mainnet.infura.io',
    'near-mainnet.infura.io',
    'near-testnet.infura.io',
    'palm-mainnet.infura.io',
    'palm-testnet.infura.io',
    'starknet-mainnet.infura.io',
    'starknet-goerli.infura.io',
    'starknet-sepolia.infura.io',
    'ipfs.infura.io',
    'sei-mainnet.infura.io',
  ];

  endpoints.forEach((endpoint) => {
    if (endpoint === 'ipfs.infura.io') {
      // IPFS endpoints are GET requests, not JSON-RPC
      mocks.push({
        urlEndpoint: new RegExp(
          `^https://${endpoint.replace(/\./g, '\\.')}/ipfs/[a-zA-Z0-9]+.*$`,
        ),
        responseCode: 200,
        response: 'Mock IPFS content',
      });
    } else {
      // Regular Infura endpoints are POST requests with JSON-RPC
      mocks.push({
        urlEndpoint: new RegExp(
          `^https://${endpoint.replace(/\./g, '\\.')}/v3/[a-zA-Z0-9]*$`,
        ),
        responseCode: 200,
        response: createJsonRpcResponse(1, '0x0'),
      });
    }
  });

  return mocks;
};

export const INFURA_MOCKS: MockEventsObject = {
  GET: createInfuraMocks().filter((mock) =>
    mock.urlEndpoint.toString().includes('ipfs'),
  ),
  POST: createInfuraMocks().filter(
    (mock) => !mock.urlEndpoint.toString().includes('ipfs'),
  ),
};
