/**
 * Mock response data for Polygon Transaction Sentinel API
 * Endpoint: https://tx-sentinel-polygon-mainnet.api.cx.metamask.io/
 * Method: infura_simulateTransactions
 */

import {
  PROXY_WALLET_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  CONDITIONAL_TOKENS_CONTRACT_ADDRESS,
  USER_WALLET_ADDRESS,
} from './polymarket-constants';

/**
 * Creates a mock transaction sentinel response
 * @param fromAddress - The address initiating the transaction (defaults to USER_WALLET_ADDRESS)
 * @param txData - Optional transaction data
 */
export const createTransactionSentinelResponse = (
  fromAddress: string = USER_WALLET_ADDRESS,
  txData: string = '0x',
) => {
  const fromAddressLower = fromAddress.toLowerCase();

  return {
    jsonrpc: '2.0',
    result: {
      transactions: [
        {
          return: '0x',
          status: '0x1',
          gasUsed: '0x94670',
          gasLimit: '0xa49f3',
          stateDiff: {
            post: {
              [PROXY_WALLET_ADDRESS.toLowerCase()]: {
                storage: {
                  '0x0000000000000000000000000000000000000000000000000000000000000005':
                    '0x0000000000000000000000000000000000000000000000000000000000000005',
                },
              },
              [USDC_CONTRACT_ADDRESS.toLowerCase()]: {
                storage: {
                  '0x6c9d8da808c4176bc7760cdb6a5717fcd40ed188da2cbfe50d45ec0f9980e51f':
                    '0x0000000000000000000000000000000000000000000000000000000928914141a40b6',
                  '0xc20a2bd7b83aedfbab0323940b3903b738f93ec72467f2a031096f5984f2eef2':
                    '0x000000000000000000000000000000000000000000000000000000009f65193',
                },
              },
              [CONDITIONAL_TOKENS_CONTRACT_ADDRESS.toLowerCase()]: {
                storage: {},
              },
              [fromAddressLower]: {
                nonce: '0x8',
              },
            },
            pre: {
              [PROXY_WALLET_ADDRESS.toLowerCase()]: {
                balance: '0x0',
                nonce: '0x1',
                storage: {
                  '0x0000000000000000000000000000000000000000000000000000000000000005':
                    '0x0000000000000000000000000000000000000000000000000000000000000004',
                },
              },
              [USDC_CONTRACT_ADDRESS.toLowerCase()]: {
                balance: '0x732bcde9f95acaf',
                nonce: '0x1',
                storage: {
                  '0x6c9d8da808c4176bc7760cdb6a5717fcd40ed188da2cbfe50d45ec0f9980e51f':
                    '0x000000000000000000000000000000000000000000000000000000092891ae5c136',
                  '0xc20a2bd7b83aedfbab0323940b3903b738f93ec72467f2a031096f5984f2eef2':
                    '0x000000000000000000000000000000000000000000000000000000032ad113',
                },
              },
              [CONDITIONAL_TOKENS_CONTRACT_ADDRESS.toLowerCase()]: {
                balance: '0x0',
                nonce: '0x1',
                storage: {},
              },
              [fromAddressLower]: {
                balance: '0xbef99c35dbe4d92',
                nonce: '0x7',
              },
            },
          },
          callTrace: {
            from: fromAddressLower,
            to: fromAddressLower,
            type: 'CALL',
            gas: '0xa49f3',
            gasUsed: '0x94670',
            value: '0x0',
            input: txData,
            output: '0x',
            error: '',
            calls: null,
          },
        },
      ],
      blockNumber: '0x4a9637e',
      id: 'd1574ab9-ecba-4e33-bf48-b04388a25589',
    },
    id: '7',
  };
};

/**
 * Creates a basic fallback transaction sentinel response (for error cases)
 */
export const createBasicTransactionSentinelResponse = () => ({
  jsonrpc: '2.0',
  result: {
    transactions: [
      {
        return: '0x',
        status: '0x1',
        gasUsed: '0x94670',
        gasLimit: '0xa49f3',
        stateDiff: {},
      },
    ],
    blockNumber: '0x4a9637e',
  },
  id: '7',
});
