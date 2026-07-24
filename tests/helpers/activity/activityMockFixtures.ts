import {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../framework/fixtures/FixtureBuilder';

export const ACTIVITY_COMPLETED_TX_HASH = '0xactivitycompletedsend001';

export const ACTIVITY_EMPTY_STATE_COPY = {
  transactionsUnfunded: {
    description: 'Add funds to your wallet to get started.',
    action: 'Add funds',
  },
  transactionsFunded: {
    description: 'Swap your first token today.',
    action: 'Swap tokens',
  },
  buySell: {
    description: 'Add funds to your wallet to get started.',
    action: 'Add funds',
  },
  predictions: {
    description: 'Your first prediction could be your best.',
    action: 'Make a prediction',
  },
  perps: {
    description: 'Your first perps trade could be your best.',
    action: 'Browse markets',
  },
  metamaskCard: {
    description: 'Manage your MetaMask Card and spend crypto anywhere.',
    action: 'Open MetaMask Card',
  },
} as const;

export const ACTIVITY_MOCK_FIXTURES = {
  completedTransactions: [
    {
      hash: ACTIVITY_COMPLETED_TX_HASH,
      timestamp: new Date(Date.now() - 3_600_000).toISOString(),
      chainId: 1,
      blockNumber: 1,
      blockHash: '0x2',
      gas: 21_000,
      gasUsed: 21_000,
      gasPrice: '1',
      effectiveGasPrice: '1',
      nonce: 1,
      cumulativeGasUsed: 21_000,
      methodId: null,
      value: '100000000000000000', // 0.1 ETH
      to: DEFAULT_FIXTURE_ACCOUNT_2,
      from: DEFAULT_FIXTURE_ACCOUNT,
      isError: false,
      valueTransfers: [],
      transactionCategory: 'STANDARD',
    },
  ],
};
