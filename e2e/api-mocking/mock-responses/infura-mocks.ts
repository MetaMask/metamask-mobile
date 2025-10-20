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

// Mock responses for common Ethereum methods
const ETH_METHODS = {
  eth_blockNumber: () => createJsonRpcResponse(1, '0x1234567'),
  eth_getBalance: () => createJsonRpcResponse(1, '0x1bc16d674ec80000'), // 2 ETH in wei
  eth_getTransactionCount: () => createJsonRpcResponse(1, '0x1a'),
  eth_gasPrice: () => createJsonRpcResponse(1, '0x3b9aca00'), // 1 gwei
  eth_estimateGas: () => createJsonRpcResponse(1, '0x5208'), // 21000 gas
  eth_sendRawTransaction: () => createJsonRpcResponse(1, '0x1234567890abcdef'),
  eth_getTransactionReceipt: () =>
    createJsonRpcResponse(1, {
      transactionHash: '0x1234567890abcdef',
      blockNumber: '0x1234567',
      blockHash: '0xabcdef1234567890',
      transactionIndex: '0x0',
      status: '0x1',
      gasUsed: '0x5208',
      effectiveGasPrice: '0x3b9aca00',
    }),
  eth_getBlockByNumber: () =>
    createJsonRpcResponse(1, {
      number: '0x1234567',
      hash: '0xabcdef1234567890',
      parentHash: '0x1234567890abcdef',
      timestamp: '0x64a1b2c3',
      gasLimit: '0x1c9c380',
      gasUsed: '0x1234567',
      transactions: [],
    }),
  net_version: () => createJsonRpcResponse(1, '1'),
  eth_chainId: () => createJsonRpcResponse(1, '0x1'),
};

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
  ];

  endpoints.forEach((endpoint) => {
    // Create method-specific mocks using requestBody matching
    Object.entries(ETH_METHODS).forEach(([method, responseFn]) => {
      mocks.push({
        urlEndpoint: new RegExp(
          `^https://${endpoint.replace(/\./g, '\\.')}/v3/[a-zA-Z0-9]*$`,
        ),
        requestBody: { method },
        responseCode: 200,
        response: responseFn(),
      });
    });

    // Generic fallback for any other JSON-RPC method
    mocks.push({
      urlEndpoint: new RegExp(
        `^https://${endpoint.replace(/\./g, '\\.')}/v3/[a-zA-Z0-9]*$`,
      ),
      responseCode: 200,
      response: createJsonRpcResponse(1, '0x0'),
    });
  });

  return mocks;
};

export const INFURA_MOCKS: MockEventsObject = {
  POST: createInfuraMocks(),
};
