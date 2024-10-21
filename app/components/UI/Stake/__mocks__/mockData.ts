import type { PooledStakes, VaultData } from '@metamask/stake-sdk';
import { TokenI } from '../../Tokens/types';

export const MOCK_STAKED_ETH_ASSET = {
  balance: '4.9999 ETH',
  balanceFiat: '$13,292.20',
  name: 'Staked Ethereum',
  symbol: 'ETH',
} as TokenI;

export const MOCK_GET_POOLED_STAKES_API_RESPONSE: PooledStakes = {
  accounts: [
    {
      account: '0x0123456789abcdef0123456789abcdef01234567',
      lifetimeRewards: '43927049303048',
      assets: '5791332670714232000',
      exitRequests: [
        {
          // Unstaking
          positionTicket: '2153260738145148336740',
          timestamp: '1727110415000',
          totalShares: '989278156820374',
          withdrawalTimestamp: null,
          exitQueueIndex: '-1',
          claimedAssets: null,
          leftShares: null,
        },
        // Requests below are claimable.
        {
          positionTicket: '515964521392314631201',
          timestamp: '1720539311000',
          totalShares: '99473618267007',
          withdrawalTimestamp: '0',
          exitQueueIndex: '57',
          claimedAssets: '100006626507361',
          leftShares: '0',
        },
        {
          positionTicket: '515964620865932898208',
          timestamp: '1720541495000',
          totalShares: '99473618267007',
          withdrawalTimestamp: '0',
          exitQueueIndex: '57',
          claimedAssets: '100006626507361',
          leftShares: '0',
        },
        {
          positionTicket: '516604671289934191921',
          timestamp: '1720607327000',
          totalShares: '1929478758729790',
          withdrawalTimestamp: '0',
          exitQueueIndex: '58',
          claimedAssets: '1939870510970987',
          leftShares: '0',
        },
      ],
    },
  ],
  exchangeRate: '1.010906701603882254',
};

export const MOCK_GET_VAULT_RESPONSE: VaultData = {
  apy: '2.853065141088762750393474836309926',
  capacity:
    '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456',
  feePercent: 1500,
  totalAssets: '7723070453364602130892',
  vaultAddress: '0x0a1b2c3d4e5f6a7b8c9dabecfd0123456789abcd',
};

export const MOCK_STAKING_EARNINGS_DATA = {
  ANNUAL_EARNING_RATE: '2.6%',
  LIFETIME_REWARDS: {
    FIAT: '$2',
    ETH: '0.02151 ETH',
  },
  EST_ANNUAL_EARNINGS: {
    FIAT: '$15.93',
    ETH: '0.0131 ETH',
  },
};

export const MOCK_REWARD_DATA = {
  REWARDS: {
    ETH: '0.13 ETH',
    FIAT: '$334.93',
  },
};
