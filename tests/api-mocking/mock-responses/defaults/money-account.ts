import { MockEventsObject } from '../../../framework';

const MUSD_ARBITRUM_TOKEN_ADDRESS =
  '0x00000000000000000000000000000000000000aa';
const ARBITRUM_CHAIN_ID = '0xa4b1';

export const MONEY_ACCOUNT_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: /^https:\/\/api\.sevenseas\.capital\/performance\/.+\/.+$/,
      responseCode: 200,
      response: {
        apy: 0,
        timestamp: new Date().toISOString(),
      },
    },
    // CHOMP service details — called on every keyring unlock by the
    // MoneyAccountUpgradeController bootstrap. Any live-network hit here
    // fails E2E tests that simply log in, so a valid default is required.
    {
      urlEndpoint: /^https:\/\/chomp\.[^/]*metamask\.io\/v1\/chomp(\?|$)/,
      responseCode: 200,
      response: {
        auth: { message: '' },
        chains: {
          [ARBITRUM_CHAIN_ID]: {
            autoDepositDelegate: '0x0000000000000000000000000000000000000001',
            protocol: {
              vedaProtocol: {
                supportedTokens: [
                  {
                    tokenAddress: MUSD_ARBITRUM_TOKEN_ADDRESS,
                    tokenDecimals: 6,
                  },
                ],
                adapterAddress: '0x0000000000000000000000000000000000000002',
                intentTypes: ['cash-deposit', 'cash-withdrawal'],
              },
            },
          },
        },
      },
    },
    {
      urlEndpoint:
        /^https:\/\/money\.api\.cx\.metamask\.io\/v1\/positions\/0x[a-fA-F0-9]{40}$/u,
      responseCode: 200,
      response: {
        address: '0x0000000000000000000000000000000000000000',
        as_of_block: 0,
        as_of_timestamp: new Date().toISOString(),
        data_freshness: 'live',
        indexer_lag_seconds: 0,
        balance: null,
        positions: [],
      },
    },
    {
      urlEndpoint:
        /^https:\/\/money\.api\.cx\.metamask\.io\/v1\/positions\/0x[a-fA-F0-9]{40}\/history(\?|$)/u,
      responseCode: 200,
      response: {
        address: '0x0000000000000000000000000000000000000000',
        cash_flows: [],
        next_cursor: null,
        has_more: false,
        as_of_block: 0,
        as_of_timestamp: new Date().toISOString(),
        data_freshness: 'live',
        indexer_lag_seconds: 0,
      },
    },
  ],
};
