import { MockEventsObject } from '../../../framework';

/**
 * Minimal mock data for staking API endpoints used in E2E testing.
 * Returns empty/basic responses to prevent API failures.
 * For specific staking tests, add detailed mocks in the test files.
 */
export const STAKING_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/pooled-staking\/stakes\/\d+\?.*$/,
      responseCode: 200,
      response: {
        accounts: [],
        exchangeRate: '1.0',
      },
    },
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/lending\/\d*\/markets$/,
      responseCode: 200,
      response: {
        markets: [],
      },
    },
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/lending\/markets$/,
      responseCode: 200,
      response: {
        markets: [],
      },
    },
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/pooled-staking\/eligibility\?.*$/,
      responseCode: 200,
      response: {
        eligible: true,
      },
    },
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/pooled-staking\/vault\/\d+\/apys\/averages$/,
      responseCode: 200,
      response: {
        oneDay: '0',
        oneWeek: '0',
        oneMonth: '0',
        threeMonths: '0',
        sixMonths: '0',
        oneYear: '0',
      },
    },
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/pooled-staking\/vault\/\d+$/,
      responseCode: 200,
      response: {
        apy: '0',
        capacity: '0',
        feePercent: 0,
        totalAssets: '0',
        vaultAddress: '0x0000000000000000000000000000000000000000',
      },
    },
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/lending\/positions\/.*$/,
      responseCode: 200,
      response: {
        positions: [],
      },
    },
    {
      urlEndpoint:
        /^https:\/\/staking\.api\.cx\.metamask\.io\/v1\/pooled-staking\/vault\/\d+\/apys\?.*$/,
      responseCode: 200,
      response: [],
    },
  ],
};
