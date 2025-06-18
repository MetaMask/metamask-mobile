/**
 * Mock responses for Mega Testnet RPC requests.
 * This file provides mocked JSON-RPC responses to avoid making real network calls during E2E tests.
 */

// Mega Testnet configuration
const MEGA_TESTNET_RPC_URL = 'https://carrot.megaeth.com/rpc';
const MEGA_TESTNET_CHAIN_ID = '0x18c6';
const MEGA_TESTNET_NETWORK_VERSION = '6342'; // Decimal version of 0x18c6

// Mock addresses and values for testing
const MOCK_ADDRESS = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';
const MOCK_BALANCE = '0xde0b6b3a7640000'; // 1 ETH in wei
const MOCK_GAS_PRICE = '0x3b9aca00'; // 1 gwei
const MOCK_GAS_ESTIMATE = '0x5208'; // 21000 gas
const MOCK_BLOCK_NUMBER = '0x1a2b3c'; // Mock block number
const MOCK_TX_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

/**
 * Get Mega Testnet RPC mocks for common JSON-RPC methods
 * @param {Object} options - Configuration options
 * @param {string[]} options.accounts - Array of account addresses to mock
 * @param {string} options.balance - Mock balance to return (default: 1 ETH)
 * @returns {Object[]} Array of RPC mock response objects
 */
export const getMegaTestnetRpcMocks = (options = {}) => {
  const { accounts = [MOCK_ADDRESS], balance = MOCK_BALANCE } = options;

  const mocks = [
    // eth_chainId - Return Mega Testnet chain ID
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: MEGA_TESTNET_CHAIN_ID,
      },
      requestBody: {
        method: 'eth_chainId',
      },
      ignoreFields: ['id', 'jsonrpc'],
      responseCode: 200,
    },

    // net_version - Return network version
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: MEGA_TESTNET_NETWORK_VERSION,
      },
      requestBody: {
        method: 'net_version',
      },
      ignoreFields: ['id', 'jsonrpc'],
      responseCode: 200,
    },

    // eth_gasPrice - Return mock gas price
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: MOCK_GAS_PRICE,
      },
      requestBody: {
        method: 'eth_gasPrice',
      },
      ignoreFields: ['id', 'jsonrpc'],
      responseCode: 200,
    },

    // eth_blockNumber - Return mock block number
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: MOCK_BLOCK_NUMBER,
      },
      requestBody: {
        method: 'eth_blockNumber',
      },
      ignoreFields: ['id', 'jsonrpc'],
      responseCode: 200,
    },

    // eth_estimateGas - Return mock gas estimate
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: MOCK_GAS_ESTIMATE,
      },
      requestBody: {
        method: 'eth_estimateGas',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_sendTransaction - Return mock transaction hash
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: MOCK_TX_HASH,
      },
      requestBody: {
        method: 'eth_sendTransaction',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_getTransactionReceipt - Return mock transaction receipt
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          transactionHash: MOCK_TX_HASH,
          transactionIndex: '0x0',
          blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          blockNumber: MOCK_BLOCK_NUMBER,
          from: MOCK_ADDRESS,
          to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
          gasUsed: MOCK_GAS_ESTIMATE,
          cumulativeGasUsed: MOCK_GAS_ESTIMATE,
          contractAddress: null,
          logs: [],
          status: '0x1', // Success
          effectiveGasPrice: MOCK_GAS_PRICE,
        },
      },
      requestBody: {
        method: 'eth_getTransactionReceipt',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_getTransactionByHash - Return mock transaction details
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          hash: MOCK_TX_HASH,
          nonce: '0x0',
          blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          blockNumber: MOCK_BLOCK_NUMBER,
          transactionIndex: '0x0',
          from: MOCK_ADDRESS,
          to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
          value: '0x0',
          gas: MOCK_GAS_ESTIMATE,
          gasPrice: MOCK_GAS_PRICE,
          input: '0x',
        },
      },
      requestBody: {
        method: 'eth_getTransactionByHash',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_getBlockByNumber - Return mock block details
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          number: MOCK_BLOCK_NUMBER,
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          parentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          timestamp: '0x61bc7c5c',
          gasLimit: '0x1c9c380',
          gasUsed: '0x5208',
          transactions: [],
        },
      },
      requestBody: {
        method: 'eth_getBlockByNumber',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_getCode - Return mock contract code (empty for EOA, bytecode for contracts)
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x', // Empty for EOA addresses
      },
      requestBody: {
        method: 'eth_getCode',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_call - Return mock contract call result
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x0000000000000000000000000000000000000000000000000000000000000001', // Generic success response
      },
      requestBody: {
        method: 'eth_call',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_getTransactionCount - Return mock nonce
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x0', // Nonce 0 for fresh account
      },
      requestBody: {
        method: 'eth_getTransactionCount',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },

    // eth_sendRawTransaction - Return mock transaction hash for submitted transactions
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: MOCK_TX_HASH,
      },
      requestBody: {
        method: 'eth_sendRawTransaction',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    },
  ];

  // Add balance mocks for each account
  accounts.forEach((address) => {
    mocks.push({
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: balance,
      },
      requestBody: {
        method: 'eth_getBalance',
      },
      ignoreFields: ['id', 'jsonrpc', 'params'],
      responseCode: 200,
    });
  });

  return mocks;
};

// Export individual mock configurations for specific use cases
export const MEGA_TESTNET_CHAIN_ID_MOCK = {
  urlEndpoint: MEGA_TESTNET_RPC_URL,
  response: {
    jsonrpc: '2.0',
    id: 1,
    result: MEGA_TESTNET_CHAIN_ID,
  },
  requestBody: {
    method: 'eth_chainId',
  },
  ignoreFields: ['id', 'jsonrpc'],
  responseCode: 200,
};

export const MEGA_TESTNET_GAS_PRICE_MOCK = {
  urlEndpoint: MEGA_TESTNET_RPC_URL,
  response: {
    jsonrpc: '2.0',
    id: 1,
    result: MOCK_GAS_PRICE,
  },
  requestBody: {
    method: 'eth_gasPrice',
  },
  ignoreFields: ['id', 'jsonrpc'],
  responseCode: 200,
};

export const MEGA_TESTNET_BALANCE_MOCK = {
  urlEndpoint: MEGA_TESTNET_RPC_URL,
  response: {
    jsonrpc: '2.0',
    id: 1,
    result: MOCK_BALANCE,
  },
  requestBody: {
    method: 'eth_getBalance',
  },
  ignoreFields: ['id', 'jsonrpc', 'params'],
  responseCode: 200,
};
