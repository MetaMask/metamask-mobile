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
const MOCK_GAS_ESTIMATE = '0xd3d4'; // Realistic gas used for ERC721 transfer
const MOCK_BLOCK_NUMBER = '0x83b4c7'; // Realistic block number
const MOCK_TX_HASH = '0xe9dd0f0f72c9888a6bf463ca0c8938c23ad9597d9d1c9e7c98787209f20e9156';

// Simple state tracking for transaction confirmation flow
let transactionSubmitted = false;
let transactionSubmittedAt = null;
let transactionBlockNumber = null;



/**
 * Get Mega Testnet RPC mocks for common JSON-RPC methods
 * @param {Object} options - Configuration options
 * @param {string[]} options.accounts - Array of account addresses to mock
 * @param {string} options.balance - Mock balance to return (default: 1 ETH)
 * @param {string} [options.contractAddress] - NFT contract address for realistic logs
 * @returns {Object[]} Array of RPC mock response objects
 */
export const getMegaTestnetRpcMocks = (options = {}) => {
  const { accounts = [MOCK_ADDRESS], balance = MOCK_BALANCE, contractAddress } = options;

  // Reset transaction state for each test
  transactionSubmitted = false;
  transactionSubmittedAt = null;
  transactionBlockNumber = null;

  // Use the provided contract address or fall back to the actual test contract address
  const nftContractAddress = contractAddress || '0xb2552e4f4bc23e1572041677234d192774558bf0';

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

    // eth_blockNumber - Return progressive block number for confirmations
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: () => {
        const baseBlockNumber = parseInt(MOCK_BLOCK_NUMBER, 16);
        let currentBlock = baseBlockNumber;

        if (transactionSubmitted && transactionSubmittedAt) {
          // Simulate new blocks every 2 seconds (faster than real Ethereum for testing)
          const timeSinceSubmission = Date.now() - transactionSubmittedAt;
          const blocksProgressed = Math.floor(timeSinceSubmission / 2000);
          currentBlock = baseBlockNumber + blocksProgressed;
        }

        return {
          jsonrpc: '2.0',
          id: 1,
          result: `0x${currentBlock.toString(16)}`,
        };
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

    // eth_getTransactionReceipt - Return mock transaction receipt with proper confirmation logic
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: () => {
        // If transaction hasn't been submitted yet, return null
        if (!transactionSubmitted || !transactionBlockNumber) {
          return {
            jsonrpc: '2.0',
            id: 1,
            result: null,
          };
        }

        // If transaction was just submitted (within 3 seconds), return null (pending)
        const timeSinceSubmission = Date.now() - transactionSubmittedAt;
        if (timeSinceSubmission < 3000) {
          return {
            jsonrpc: '2.0',
            id: 1,
            result: null,
          };
        }

        // After 3 seconds, return the transaction receipt
        // Use the actual transaction block number
        const txBlockHex = `0x${transactionBlockNumber.toString(16)}`;

        return {
          jsonrpc: '2.0',
          id: 1,
          result: {
            blockHash: '0x61344a962fffea5aa82413fb4245aa0733e867015ee6b69ed7ce7112f155d9a6',
            blockNumber: txBlockHex,
            contractAddress: null,
            cumulativeGasUsed: '0x4f8c0b',
            effectiveGasPrice: '0x209380a91',
            from: MOCK_ADDRESS,
            gasUsed: MOCK_GAS_ESTIMATE,
            logs: [
              {
                address: nftContractAddress,
                blockHash: '0x61344a962fffea5aa82413fb4245aa0733e867015ee6b69ed7ce7112f155d9a6',
                blockNumber: txBlockHex,
                data: '0x',
                logIndex: '0x5d',
                removed: false,
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                  `0x000000000000000000000000${MOCK_ADDRESS.substring(2)}`,
                  '0x0000000000000000000000002f318c334780961fb129d2a6c30d0763d9a5c970',
                  '0x0000000000000000000000000000000000000000000000000000000000000001'
                ],
                transactionHash: MOCK_TX_HASH,
                transactionIndex: '0x2b'
              }
            ],
            logsBloom: '0x00000000000000000200000000000000000000000000001000000100000000000000000000000000000000000400000000000000000000000000004000040000000000000000000000000028000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000200000000000000040000000000000000000000000000800000000000000002000000000000000000000',
            status: '0x1',
            to: nftContractAddress,
            transactionHash: MOCK_TX_HASH,
            transactionIndex: '0x2b',
            type: '0x2'
          },
        };
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

    // eth_getBlockByNumber - Return mock block details with progressive numbers
    {
      urlEndpoint: MEGA_TESTNET_RPC_URL,
      response: () => {
        const baseBlockNumber = parseInt(MOCK_BLOCK_NUMBER, 16);
        let currentBlock = baseBlockNumber;

        if (transactionSubmitted && transactionSubmittedAt) {
          // Simulate new blocks every 2 seconds (same as eth_blockNumber)
          const timeSinceSubmission = Date.now() - transactionSubmittedAt;
          const blocksProgressed = Math.floor(timeSinceSubmission / 2000);
          currentBlock = baseBlockNumber + blocksProgressed;
        }

        return {
          jsonrpc: '2.0',
          id: 1,
          result: {
            number: `0x${currentBlock.toString(16)}`,
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            parentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`, // Current timestamp
            gasLimit: '0x1c9c380',
            gasUsed: '0x5208',
            transactions: [],
          },
        };
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
      response: () => {
        // Mark transaction as submitted and record the block it was mined in
        transactionSubmitted = true;
        transactionSubmittedAt = Date.now();
        // Transaction gets mined in the next block after submission
        transactionBlockNumber = parseInt(MOCK_BLOCK_NUMBER, 16) + 1;

        return {
          jsonrpc: '2.0',
          id: 1,
          result: MOCK_TX_HASH,
        };
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
