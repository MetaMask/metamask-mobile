import { device } from 'detox';

const SENDER_ADDRESS_MOCK = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';
const RECIPIENT_ADDRESS_MOCK = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

const SENTINEL_URL = 'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io';
const LOCALHOST_SENTINEL_URL =
  device.getPlatform() === 'android'
    ? 'https://tx-sentinel-127.0.0.1.api.cx.metamask.io/'
    : 'https://tx-sentinel-localhost.api.cx.metamask.io/';

export const SEND_ETH_TRANSACTION_MOCK = {
  data: '0x',
  from: SENDER_ADDRESS_MOCK,
  to: RECIPIENT_ADDRESS_MOCK,
  value: '0xde0b6B3a7640000',
};

export const SEND_ETH_SIMULATION_MOCK = {
  requestBody: {
    id: '0',
    jsonrpc: '2.0',
    method: 'infura_simulateTransactions',
    params: [
      {
        transactions: [SEND_ETH_TRANSACTION_MOCK],
        suggestFees: { withFeeTransfer: true, withTransfer: true },
      },
    ],
  },
  ignoreFields: [
    'params.0.blockOverrides',
    'id',
    'params.0.transactions',
    'params.0.suggestFees',
  ],
  urlEndpoint: LOCALHOST_SENTINEL_URL,
  response: {
    jsonrpc: '2.0',
    result: {
      transactions: [
        {
          return: '0x',
          status: '0x1',
          gasUsed: '0x5208',
          gasLimit: '0x5208',
          fees: [
            {
              maxFeePerGas: '0xe49f91ac',
              maxPriorityFeePerGas: '0x3b9aca04',
              gas: '0x5208',
              balanceNeeded: '0xDE0FFF5E909F768',
              currentBalance: '0x3635C9ADC5DEA00000',
              error: '',
            },
          ],
          stateDiff: {
            post: {
              [SENDER_ADDRESS_MOCK]: {
                balance: '0x3625c9adc19b620000',
                nonce: '0x1',
              },
              [RECIPIENT_ADDRESS_MOCK]: {
                balance: '0xde0b6B3a7640000',
              },
            },
            pre: {
              [SENDER_ADDRESS_MOCK]: {
                balance: '0x3635C9adc5dea00000',
                nonce: '0x0',
              },
              [RECIPIENT_ADDRESS_MOCK]: {
                balance: '0x0',
                nonce: '0x24',
              },
            },
          },
          callTrace: {
            from: SENDER_ADDRESS_MOCK,
            to: RECIPIENT_ADDRESS_MOCK,
            type: 'CALL',
            gas: '0x1dcd6500',
            gasUsed: '0x5208',
            value: '0xde0b6B3a7640000',
            input: '0x',
            output: '0x',
            error: '',
            calls: null,
          },
          feeEstimate: 58176096363000,
          baseFeePerGas: 1770290302,
        },
      ],
      blockNumber: '0x53afbb',
      id: '09156630-b754-4bb8-bfc4-3390d934cec6',
    },
    id: '42',
  },
  responseCode: 200,
};

export const SIMULATION_ENABLED_NETWORKS_MOCK = {
  urlEndpoint: `${SENTINEL_URL}/networks`,
  responseCode: 200,
  response: {
    1337: {
      name: 'Localhost',
      group: 'ethereum',
      chainID: 1337,
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      },
      network: 'localhost',
      explorer: 'http://localhost:8545/explorer',
      confirmations: true,
      smartTransactions: true,
      relayTransactions: false,
      hidden: false,
    },
  },
};
