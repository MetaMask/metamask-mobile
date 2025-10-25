const SENDER_ADDRESS_MOCK = '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';
const POLYGON_SENTINEL_URL =
  'https://tx-sentinel-polygon-mainnet.api.cx.metamask.io';

// Mock transaction data for Polymarket withdraw on Polygon
export const POLYMARKET_WITHDRAW_TRANSACTION_MOCK = {
  data: '0xe9ae5c530100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000e49267bcddd5e137ea83b24731491b3d8c4b5c550000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000e49267bcddd5e137ea83b24731491b3d8c4b5c55000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  from: SENDER_ADDRESS_MOCK,
  gas: '0xed4b',
  maxFeePerGas: '0x7d2480d2e',
  maxPriorityFeePerGas: '0x7d2480a76',
  to: SENDER_ADDRESS_MOCK,
  value: '0x0',
};

export const POLYMARKET_WITHDRAW_SIMULATION_MOCK = {
  requestBody: {
    id: '27',
    jsonrpc: '2.0',
    method: 'infura_simulateTransactions',
    params: [
      {
        withCallTrace: true,
        withLogs: true,
        transactions: [POLYMARKET_WITHDRAW_TRANSACTION_MOCK],
        withGas: true,
        withDefaultBlockOverrides: true,
      },
    ],
  },
  ignoreFields: [
    'params.0.blockOverrides',
    'id',
    'params.0.transactions',
    'params.0.withCallTrace',
    'params.0.withLogs',
    'params.0.withGas',
    'params.0.withDefaultBlockOverrides',
  ],
  urlEndpoint: POLYGON_SENTINEL_URL,
  response: {
    jsonrpc: '2.0',
    result: {
      transactions: [
        {
          return: '0x',
          status: '0x1',
          gasUsed: '0xed4b',
          gasLimit: '0xed4b',
          fees: [
            {
              maxFeePerGas: '0x7d2480d2e',
              maxPriorityFeePerGas: '0x7d2480a76',
              gas: '0xed4b',
              balanceNeeded: '0x0',
              currentBalance: '0x3635C9ADC5DEA00000',
              error: '',
            },
          ],
          stateDiff: {
            post: {
              [SENDER_ADDRESS_MOCK]: {
                balance: '0x3635C9ADC5DEA00000',
                nonce: '0x1',
              },
            },
            pre: {
              [SENDER_ADDRESS_MOCK]: {
                balance: '0x3635C9ADC5DEA00000',
                nonce: '0x0',
              },
            },
          },
          callTrace: {
            from: SENDER_ADDRESS_MOCK,
            to: SENDER_ADDRESS_MOCK,
            type: 'CALL',
            gas: '0xed4b',
            gasUsed: '0xed4b',
            value: '0x0',
            input: POLYMARKET_WITHDRAW_TRANSACTION_MOCK.data,
            output: '0x',
            error: '',
            calls: [
              {
                from: SENDER_ADDRESS_MOCK,
                to: '0xe49267bcddd5e137ea83b24731491b3d8c4b5c55',
                type: 'CALL',
                gas: '0x1dcd6500',
                gasUsed: '0x5208',
                value: '0x0',
                input: '0x',
                output: '0x',
                error: '',
                calls: null,
              },
              {
                from: SENDER_ADDRESS_MOCK,
                to: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                type: 'CALL',
                gas: '0x1dcd6500',
                gasUsed: '0x5208',
                value: '0x0',
                input:
                  '0xa9059cbb000000000000000000000000e49267bcddd5e137ea83b24731491b3d8c4b5c55000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                output: '0x',
                error: '',
                calls: null,
              },
            ],
          },
          feeEstimate: 1000000000000000, // 0.001 MATIC
          baseFeePerGas: 30000000000, // 30 gwei
        },
      ],
      blockNumber: '0x1234567',
      id: '09156630-b754-4bb8-bfc4-3390d934cec6',
    },
    id: '27',
  },
  responseCode: 200,
};

export const POLYGON_SIMULATION_ENABLED_NETWORKS_MOCK = {
  urlEndpoint: `${POLYGON_SENTINEL_URL}/networks`,
  responseCode: 200,
  response: {
    137: {
      name: 'Polygon Mainnet',
      group: 'polygon',
      chainID: 137,
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18,
      },
      network: 'polygon',
      explorer: 'https://polygonscan.com',
      confirmations: true,
      smartTransactions: true,
      relayTransactions: false,
      hidden: false,
    },
  },
};
