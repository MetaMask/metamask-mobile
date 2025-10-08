import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../framework/fixtures/FixtureBuilder';

const REWARDS_API_BASE_URL = 'https://rewards.uat-api.cx.metamask.io';
const SUBSCRIPTION_ID = '${SUBSCRIPTION_ID}';

const POINTS_EVENTS_AFTER_ONBOARDING = {
  results: [
    {
      id: `sb-${SUBSCRIPTION_ID}`,
      timestamp: '2025-10-06T11:40:37.940Z',
      type: 'SIGN_UP_BONUS',
      value: 250,
      bonus: {},
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T11:40:38.515Z',
    },
  ],
  has_more: false,
  cursor: null,
};

const POINTS_EVENTS_MOCK = {
  results: [
    {
      id: `sb-${SUBSCRIPTION_ID}`,
      timestamp: '2025-10-06T11:40:37.940Z',
      type: 'SIGN_UP_BONUS',
      value: 250,
      bonus: {},
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T11:40:38.515Z',
      payload: null,
    },
    {
      id: `swap-${SUBSCRIPTION_ID}-001`,
      timestamp: '2025-10-06T12:15:22.123Z',
      type: 'SWAP',
      value: 10,
      bonus: {
        bips: 5000,
        bonuses: ['mobile_boost'],
      },
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T12:15:23.456Z',
      payload: {
        srcAsset: {
          amount: '1000000000000000000',
          type: 'eip155:1/slip44:60',
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        destAsset: {
          amount: '1000000000',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        txHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    },
    {
      id: `perps-${SUBSCRIPTION_ID}-001`,
      timestamp: '2025-10-06T13:30:45.789Z',
      type: 'PERPS',
      value: 75,
      bonus: {
        bips: null,
        bonuses: null,
      },
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T13:30:46.012Z',
      payload: {
        type: 'OPEN_POSITION',
        direction: 'LONG',
        asset: {
          amount: '500000000000000000',
          type: 'eip155:42161/slip44:60',
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        pnl: '12.5',
      },
    },
    {
      id: `referral-${SUBSCRIPTION_ID}-001`,
      timestamp: '2025-10-06T14:45:12.345Z',
      type: 'REFERRAL',
      value: 100,
      bonus: {},
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T14:45:13.678Z',
      payload: null,
    },
    {
      id: `loyalty-${SUBSCRIPTION_ID}-001`,
      timestamp: '2025-10-06T15:20:30.567Z',
      type: 'LOYALTY_BONUS',
      value: 50,
      bonus: {},
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T15:20:31.890Z',
      payload: null,
    },
    {
      id: `onetime-${SUBSCRIPTION_ID}-001`,
      timestamp: '2025-10-06T16:10:15.234Z',
      type: 'ONE_TIME_BONUS',
      value: 300,
      bonus: {
        bips: 2000,
        bonuses: ['special_event'],
      },
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T16:10:16.567Z',
      payload: null,
    },
    {
      id: `swap-${SUBSCRIPTION_ID}-002`,
      timestamp: '2025-10-06T17:25:33.789Z',
      type: 'SWAP',
      value: 11,
      bonus: {
        bips: 990000,
        bonuses: ['arbitrum_usdc_boost'],
      },
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T17:25:34.123Z',
      payload: {
        srcAsset: {
          amount: '2000000000000000000',
          type: 'eip155:42161/slip44:60',
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        destAsset: {
          amount: '5000000000',
          type: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        txHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      },
    },
    {
      id: `swap-${SUBSCRIPTION_ID}-003`,
      timestamp: '2025-10-06T18:45:12.456Z',
      type: 'SWAP',
      value: 5,
      bonus: {
        bips: null,
        bonuses: null,
      },
      accountAddress: DEFAULT_FIXTURE_ACCOUNT,
      updatedAt: '2025-10-06T18:45:13.789Z',
      payload: {
        srcAsset: {
          amount: '100000000',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        destAsset: {
          amount: '50000000000000000',
          type: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
          decimals: 18,
          name: 'Dai Stablecoin',
          symbol: 'DAI',
        },
        txHash:
          '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      },
    },
  ],
  has_more: true,
  cursor: null,
};

const SEASON_STATUS_RESPONSE_ONBOARDING = {
  season: {
    id: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
    name: 'Season 1',
    startDate: '2025-09-01T04:00:00.000Z',
    endDate: '2025-11-30T04:00:00.000Z',
    tiers: [
      {
        id: 'deb27e87-ed2c-4602-a4ba-3ed3de7fbe2b',
        name: 'Origin',
        pointsNeeded: 0,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/2E2VwVkQr8OPxgN9LxpucW/b4191e51486d817371e80244068636c9/level1-origin.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/2E2VwVkQr8OPxgN9LxpucW/b4191e51486d817371e80244068636c9/level1-origin.png',
        },
        levelNumber: 'Level 1',
        rewards: [],
      },
      {
        id: '0961380d-b62e-4f91-ab84-c2f9b90df3d8',
        name: 'Frontier UAT',
        pointsNeeded: 600,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/6XLXuclVLl32SDtMkxwmU2/81ffd73ba8ed3e6a541467f4f4f20c44/level2-frontier.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/6XLXuclVLl32SDtMkxwmU2/81ffd73ba8ed3e6a541467f4f4f20c44/level2-frontier.png',
        },
        levelNumber: 'Level 2',
        rewards: [
          {
            id: '92964046-c81a-4c6f-a7d2-38ed7f2e8a78',
            name: 'Qualify for $LINEA',
            shortDescription: 'Based on your total points at end of the season',
            longDescription:
              'Unlocking this reward qualifies you for a $LINEA token claim at the end of this season. Your total $LINEA reward will be based on your total points earned in the season vs points earned by all users participating. More points = more tokens!',
            shortUnlockedDescription: 'More points = more tokens. Keep going!',
            longUnlockedDescription:
              'You qualify for a $LINEA token claim at the end of this season! Keep earning points to get more $LINEA. At the end of the season, come back to collect your $LINEA. ',
            iconName: 'Coin',
            rewardType: 'GENERIC',
            seasonTierId: '0961380d-b62e-4f91-ab84-c2f9b90df3d8',
            createdAt: '2025-09-17T08:32:37.287Z',
            updatedAt: '2025-09-17T08:32:37.287Z',
          },
        ],
      },
      {
        id: '6438986a-fca9-4fa0-9226-7cc5810c4230',
        name: 'Sylvana UAT',
        pointsNeeded: 800,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/NtSEKGZcZ1iKYwghFZ1Hg/77101864677c7adb526bfc52844bc0fd/level3-sylvana.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/NtSEKGZcZ1iKYwghFZ1Hg/77101864677c7adb526bfc52844bc0fd/level3-sylvana.png',
        },
        levelNumber: 'Level 3',
        rewards: [
          {
            id: 'b2416275-68ac-44c8-8e15-c72d36df6fb4',
            name: '50% points boost',
            shortDescription: 'Valid for 24 hours',
            longDescription:
              'Unlock and claim this reward to get a 50% boost on all swaps and perps trades for the next 24 hours.',
            shortUnlockedDescription: 'Valid for 24 hours',
            longUnlockedDescription:
              'Claim this reward to get a 50% boost on all swaps and perps trades for the next 24 hours. The timer starts as soon as you claim it.',
            iconName: 'Tag',
            rewardType: 'POINTS_BOOST',
            seasonTierId: '6438986a-fca9-4fa0-9226-7cc5810c4230',
            createdAt: '2025-09-17T08:32:37.249Z',
            updatedAt: '2025-09-17T18:30:37.690Z',
          },
        ],
      },
      {
        id: 'e32e72c2-7e8a-4f47-9a72-9667a742d4bb',
        name: 'Oceania UAT',
        pointsNeeded: 1000,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/4crrZDPZCnhUit9hKsKpJQ/df43411458fee75a76b76afd375cc9e3/level4-oceania.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/4crrZDPZCnhUit9hKsKpJQ/df43411458fee75a76b76afd375cc9e3/level4-oceania.png',
        },
        levelNumber: 'Level 4',
        rewards: [
          {
            id: 'eab7e0cb-79cd-40ae-8ede-1f318554a725',
            name: '50% off Perps fees',
            shortDescription:
              'Reduced fees for the season. Not available in all regions.',
            longDescription:
              'Unlocking this reward will give you a 50% discount on MetaMask fees for perps trades throughout the rest of the season.\n\nNote: perps may not be available in some regions.',
            shortUnlockedDescription:
              'Reduced fees for the season. Not available in all regions.',
            longUnlockedDescription:
              'Congratulations, you have unlocked a 50% discount on MetaMask fees for perps trades. This discount is valid for the rest of the season. \n\nNote: perps may not be available in some regions.',
            iconName: 'Tag',
            rewardType: 'PERPS_DISCOUNT',
            seasonTierId: 'e32e72c2-7e8a-4f47-9a72-9667a742d4bb',
            createdAt: '2025-09-17T08:32:37.305Z',
            updatedAt: '2025-09-22T13:18:48.652Z',
          },
        ],
      },
      {
        id: '10ab8e2b-72ca-4e48-87f2-f51f6d467ffa',
        name: 'Denalia UAT',
        pointsNeeded: 1300,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/3dsWGbAaynPxd0BN0Ax1oR/2e41dd391daa03ce426dc9eacbd3e204/level5-denalia.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/3dsWGbAaynPxd0BN0Ax1oR/2e41dd391daa03ce426dc9eacbd3e204/level5-denalia.png',
        },
        levelNumber: 'Level 5',
        rewards: [
          {
            id: '877adf22-14f9-449d-950d-d918baf197fe',
            name: 'Priority support',
            shortDescription: 'Get faster, dedicated support anytime',
            longDescription:
              'Unlocking this reward will give you fast access to MetaMask support.',
            shortUnlockedDescription: 'Get faster, dedicated support anytime',
            longUnlockedDescription:
              "Need support? You've unlocked fast access to MetaMask support. Get in touch with our team:",
            claimUrl: 'https://support.metamask.io?address={address}',
            iconName: 'Flash',
            rewardType: 'GENERIC',
            seasonTierId: '10ab8e2b-72ca-4e48-87f2-f51f6d467ffa',
            createdAt: '2025-09-17T08:32:37.271Z',
            updatedAt: '2025-09-17T18:30:37.710Z',
          },
        ],
      },
      {
        id: '6712c53d-47bb-437a-9163-fd03aeda7c18',
        name: 'Titana UAT',
        pointsNeeded: 1600,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/72vEUZAPeUFdrbbb49QPUU/cd28022f5e947159ebec620011897144/level6-titana.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/72vEUZAPeUFdrbbb49QPUU/cd28022f5e947159ebec620011897144/level6-titana.png',
        },
        levelNumber: 'Level 6',
        rewards: [
          {
            id: 'c4d23859-ee16-4d75-9278-1941838474ad',
            name: 'MetaMask Metal Card',
            shortDescription:
              'To be claimed at end of season. Not available in all regions.',
            longDescription:
              'Unlocking this reward will qualify you for 1 free year of MetaMask Metal Card, to be claimed at the end of this season. \n\nNote: this reward is not available in all regions and is subject to approval.',
            shortUnlockedDescription:
              'To be claimed at end of season. Not available in all regions.',
            longUnlockedDescription:
              'Congratulations, you unlocked 1 free year of MetaMask Metal Card, to be claimed at the end of this season. \n\nNote: this reward is not available in all regions and is subject to approval.',
            iconName: 'Card',
            rewardType: 'GENERIC',
            seasonTierId: '6712c53d-47bb-437a-9163-fd03aeda7c18',
            createdAt: '2025-09-17T08:32:37.190Z',
            updatedAt: '2025-09-17T08:32:37.190Z',
          },
          {
            id: 'a81e289d-8bf6-441d-9927-0e4a71eeedaf',
            name: '65% off Perps fees',
            shortDescription:
              'Reduced fees for the season. Not available in all regions.',
            longDescription:
              'Unlocking this reward will give you a 65% discount on MetaMask fees for perps trades throughout the rest of the season. This discount replaces the 50% discount.\n\nNote: perps may not be available in some regions.',
            shortUnlockedDescription:
              'Reduced fees for the season. Not available in all regions.',
            longUnlockedDescription:
              'Congratulations, you have unlocked a 65% discount on MetaMask fees for perps trades. This discount is valid for the rest of the season. It replaces the 50% discount.\n\nNote: perps may not be available in some regions.',
            iconName: 'Tag',
            rewardType: 'PERPS_DISCOUNT',
            seasonTierId: '6712c53d-47bb-437a-9163-fd03aeda7c18',
            createdAt: '2025-09-17T08:32:37.169Z',
            updatedAt: '2025-09-22T13:18:48.295Z',
          },
        ],
      },
      {
        id: 'f44d417d-7526-47e9-afb3-cd9d0c625af7',
        name: 'Utopia UAT',
        pointsNeeded: 2000,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/gd1IVS0Q3rMJsEezYkGd1/a0ae03f51876518b27c0ecc165174ba4/level7-utopia.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/gd1IVS0Q3rMJsEezYkGd1/a0ae03f51876518b27c0ecc165174ba4/level7-utopia.png',
        },
        levelNumber: 'Level 7',
        rewards: [
          {
            id: '52aa7be1-4905-46c2-a976-d1c7e6074555',
            name: 'AlphaFoxes Telegram invite',
            shortDescription: 'Get the alpha in our exclusive group',
            longDescription:
              'Unlock this reward to get an exclusive invite to AlphaFoxes: a private Telegram group for top community members. AlphaFoxes get exclusive access to MetaMask leadership, sneak peeks of upcoming features, and alpha on crypto industry news.\n\nInvites are sent weekly.',
            shortUnlockedDescription: 'Join the exclusive group',
            longUnlockedDescription:
              "You've unlocked an invite to AlphaFoxes: a private Telegram group for top community members. Share your handle to get exclusive access to MetaMask leadership, sneak peeks of upcoming features, and alpha on crypto industry news.\n\nInvites are sent weekly.",
            iconName: 'Sms',
            rewardType: 'ALPHA_FOX_INVITE',
            seasonTierId: 'f44d417d-7526-47e9-afb3-cd9d0c625af7',
            createdAt: '2025-09-17T08:32:37.365Z',
            updatedAt: '2025-09-17T18:30:37.901Z',
          },
        ],
      },
    ],
  },
  balance: {
    total: 250,
    refereePortion: 0,
    updatedAt: '2025-10-06T11:50:33.403Z',
  },
  currentTierId: 'deb27e87-ed2c-4602-a4ba-3ed3de7fbe2b',
};

const SEASON_STATUS_RESPONSE = {
  season: {
    id: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
    name: 'Season 1',
    startDate: '2025-09-01T04:00:00.000Z',
    endDate: '2025-11-30T04:00:00.000Z',
    tiers: [
      {
        id: 'deb27e87-ed2c-4602-a4ba-3ed3de7fbe2b',
        name: 'Origin',
        pointsNeeded: 0,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/2E2VwVkQr8OPxgN9LxpucW/b4191e51486d817371e80244068636c9/level1-origin.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/2E2VwVkQr8OPxgN9LxpucW/b4191e51486d817371e80244068636c9/level1-origin.png',
        },
        levelNumber: 'Level 1',
        rewards: [],
      },
      {
        id: '0961380d-b62e-4f91-ab84-c2f9b90df3d8',
        name: 'Frontier UAT',
        pointsNeeded: 600,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/6XLXuclVLl32SDtMkxwmU2/81ffd73ba8ed3e6a541467f4f4f20c44/level2-frontier.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/6XLXuclVLl32SDtMkxwmU2/81ffd73ba8ed3e6a541467f4f4f20c44/level2-frontier.png',
        },
        levelNumber: 'Level 2',
        rewards: [
          {
            id: '92964046-c81a-4c6f-a7d2-38ed7f2e8a78',
            name: 'Qualify for $LINEA',
            shortDescription: 'Based on your total points at end of the season',
            longDescription:
              'Unlocking this reward qualifies you for a $LINEA token claim at the end of this season. Your total $LINEA reward will be based on your total points earned in the season vs points earned by all users participating. More points = more tokens!',
            shortUnlockedDescription: 'More points = more tokens. Keep going!',
            longUnlockedDescription:
              'You qualify for a $LINEA token claim at the end of this season! Keep earning points to get more $LINEA. At the end of the season, come back to collect your $LINEA. ',
            iconName: 'Coin',
            rewardType: 'GENERIC',
            seasonTierId: '0961380d-b62e-4f91-ab84-c2f9b90df3d8',
            createdAt: '2025-09-17T08:32:37.287Z',
            updatedAt: '2025-09-17T08:32:37.287Z',
          },
        ],
      },
      {
        id: '6438986a-fca9-4fa0-9226-7cc5810c4230',
        name: 'Sylvana UAT',
        pointsNeeded: 800,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/NtSEKGZcZ1iKYwghFZ1Hg/77101864677c7adb526bfc52844bc0fd/level3-sylvana.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/NtSEKGZcZ1iKYwghFZ1Hg/77101864677c7adb526bfc52844bc0fd/level3-sylvana.png',
        },
        levelNumber: 'Level 3',
        rewards: [
          {
            id: 'b2416275-68ac-44c8-8e15-c72d36df6fb4',
            name: '50% points boost',
            shortDescription: 'Valid for 24 hours',
            longDescription:
              'Unlock and claim this reward to get a 50% boost on all swaps and perps trades for the next 24 hours.',
            shortUnlockedDescription: 'Valid for 24 hours',
            longUnlockedDescription:
              'Claim this reward to get a 50% boost on all swaps and perps trades for the next 24 hours. The timer starts as soon as you claim it.',
            iconName: 'Tag',
            rewardType: 'POINTS_BOOST',
            seasonTierId: '6438986a-fca9-4fa0-9226-7cc5810c4230',
            createdAt: '2025-09-17T08:32:37.249Z',
            updatedAt: '2025-09-17T18:30:37.690Z',
          },
        ],
      },
      {
        id: 'e32e72c2-7e8a-4f47-9a72-9667a742d4bb',
        name: 'Oceania UAT',
        pointsNeeded: 1000,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/4crrZDPZCnhUit9hKsKpJQ/df43411458fee75a76b76afd375cc9e3/level4-oceania.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/4crrZDPZCnhUit9hKsKpJQ/df43411458fee75a76b76afd375cc9e3/level4-oceania.png',
        },
        levelNumber: 'Level 4',
        rewards: [
          {
            id: 'eab7e0cb-79cd-40ae-8ede-1f318554a725',
            name: '50% off Perps fees',
            shortDescription:
              'Reduced fees for the season. Not available in all regions.',
            longDescription:
              'Unlocking this reward will give you a 50% discount on MetaMask fees for perps trades throughout the rest of the season.\n\nNote: perps may not be available in some regions.',
            shortUnlockedDescription:
              'Reduced fees for the season. Not available in all regions.',
            longUnlockedDescription:
              'Congratulations, you have unlocked a 50% discount on MetaMask fees for perps trades. This discount is valid for the rest of the season. \n\nNote: perps may not be available in some regions.',
            iconName: 'Tag',
            rewardType: 'PERPS_DISCOUNT',
            seasonTierId: 'e32e72c2-7e8a-4f47-9a72-9667a742d4bb',
            createdAt: '2025-09-17T08:32:37.305Z',
            updatedAt: '2025-09-22T13:18:48.652Z',
          },
        ],
      },
      {
        id: '10ab8e2b-72ca-4e48-87f2-f51f6d467ffa',
        name: 'Denalia UAT',
        pointsNeeded: 1300,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/3dsWGbAaynPxd0BN0Ax1oR/2e41dd391daa03ce426dc9eacbd3e204/level5-denalia.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/3dsWGbAaynPxd0BN0Ax1oR/2e41dd391daa03ce426dc9eacbd3e204/level5-denalia.png',
        },
        levelNumber: 'Level 5',
        rewards: [
          {
            id: '877adf22-14f9-449d-950d-d918baf197fe',
            name: 'Priority support',
            shortDescription: 'Get faster, dedicated support anytime',
            longDescription:
              'Unlocking this reward will give you fast access to MetaMask support.',
            shortUnlockedDescription: 'Get faster, dedicated support anytime',
            longUnlockedDescription:
              "Need support? You've unlocked fast access to MetaMask support. Get in touch with our team:",
            claimUrl: 'https://support.metamask.io?address={address}',
            iconName: 'Flash',
            rewardType: 'GENERIC',
            seasonTierId: '10ab8e2b-72ca-4e48-87f2-f51f6d467ffa',
            createdAt: '2025-09-17T08:32:37.271Z',
            updatedAt: '2025-09-17T18:30:37.710Z',
          },
        ],
      },
      {
        id: '6712c53d-47bb-437a-9163-fd03aeda7c18',
        name: 'Titana UAT',
        pointsNeeded: 1600,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/72vEUZAPeUFdrbbb49QPUU/cd28022f5e947159ebec620011897144/level6-titana.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/72vEUZAPeUFdrbbb49QPUU/cd28022f5e947159ebec620011897144/level6-titana.png',
        },
        levelNumber: 'Level 6',
        rewards: [
          {
            id: 'c4d23859-ee16-4d75-9278-1941838474ad',
            name: 'MetaMask Metal Card',
            shortDescription:
              'To be claimed at end of season. Not available in all regions.',
            longDescription:
              'Unlocking this reward will qualify you for 1 free year of MetaMask Metal Card, to be claimed at the end of this season. \n\nNote: this reward is not available in all regions and is subject to approval.',
            shortUnlockedDescription:
              'To be claimed at end of season. Not available in all regions.',
            longUnlockedDescription:
              'Congratulations, you unlocked 1 free year of MetaMask Metal Card, to be claimed at the end of this season. \n\nNote: this reward is not available in all regions and is subject to approval.',
            iconName: 'Card',
            rewardType: 'GENERIC',
            seasonTierId: '6712c53d-47bb-437a-9163-fd03aeda7c18',
            createdAt: '2025-09-17T08:32:37.190Z',
            updatedAt: '2025-09-17T08:32:37.190Z',
          },
          {
            id: 'a81e289d-8bf6-441d-9927-0e4a71eeedaf',
            name: '65% off Perps fees',
            shortDescription:
              'Reduced fees for the season. Not available in all regions.',
            longDescription:
              'Unlocking this reward will give you a 65% discount on MetaMask fees for perps trades throughout the rest of the season. This discount replaces the 50% discount.\n\nNote: perps may not be available in some regions.',
            shortUnlockedDescription:
              'Reduced fees for the season. Not available in all regions.',
            longUnlockedDescription:
              'Congratulations, you have unlocked a 65% discount on MetaMask fees for perps trades. This discount is valid for the rest of the season. It replaces the 50% discount.\n\nNote: perps may not be available in some regions.',
            iconName: 'Tag',
            rewardType: 'PERPS_DISCOUNT',
            seasonTierId: '6712c53d-47bb-437a-9163-fd03aeda7c18',
            createdAt: '2025-09-17T08:32:37.169Z',
            updatedAt: '2025-09-22T13:18:48.295Z',
          },
        ],
      },
      {
        id: 'f44d417d-7526-47e9-afb3-cd9d0c625af7',
        name: 'Utopia UAT',
        pointsNeeded: 2000,
        seasonId: 'f3f0ccae-33e9-4256-b5d9-c42105570fa5',
        image: {
          darkModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/gd1IVS0Q3rMJsEezYkGd1/a0ae03f51876518b27c0ecc165174ba4/level7-utopia.png',
          lightModeUrl:
            'https://images.ctfassets.net/9sy2a0egs6zh/gd1IVS0Q3rMJsEezYkGd1/a0ae03f51876518b27c0ecc165174ba4/level7-utopia.png',
        },
        levelNumber: 'Level 7',
        rewards: [
          {
            id: '52aa7be1-4905-46c2-a976-d1c7e6074555',
            name: 'AlphaFoxes Telegram invite',
            shortDescription: 'Get the alpha in our exclusive group',
            longDescription:
              'Unlock this reward to get an exclusive invite to AlphaFoxes: a private Telegram group for top community members. AlphaFoxes get exclusive access to MetaMask leadership, sneak peeks of upcoming features, and alpha on crypto industry news.\n\nInvites are sent weekly.',
            shortUnlockedDescription: 'Join the exclusive group',
            longUnlockedDescription:
              'You’ve unlocked an invite to AlphaFoxes: a private Telegram group for top community members. Share your handle to get exclusive access to MetaMask leadership, sneak peeks of upcoming features, and alpha on crypto industry news.\n\nInvites are sent weekly.',
            iconName: 'Sms',
            rewardType: 'ALPHA_FOX_INVITE',
            seasonTierId: 'f44d417d-7526-47e9-afb3-cd9d0c625af7',
            createdAt: '2025-09-17T08:32:37.365Z',
            updatedAt: '2025-09-17T18:30:37.901Z',
          },
        ],
      },
    ],
  },
  balance: {
    total: 1245,
    refereePortion: 0,
    updatedAt: '2025-10-04T04:58:50.025Z',
  },
  currentTierId: 'e32e72c2-7e8a-4f47-9a72-9667a742d4bb',
};

const setupGeolocationMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
    response: 'US',
    responseCode: 200,
  });
};

const setupRewardsOisMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: `${REWARDS_API_BASE_URL}/public/rewards/ois`,
    response: {
      ois: [false],
      sids: [null],
    },
    responseCode: 200,
  });
};

const setupSeasonStatusMock = async (
  mockServer: Mockttp,
  customResponse?: unknown,
) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: `${REWARDS_API_BASE_URL}/seasons/current/status`,
    response: customResponse || SEASON_STATUS_RESPONSE_ONBOARDING,
    responseCode: 200,
  });
};

const setupActiveBoostsMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: `${REWARDS_API_BASE_URL}/seasons/f3f0ccae-33e9-4256-b5d9-c42105570fa5/active-boosts`,
    response: {
      boosts: [
        {
          id: 'beb60ffc-4858-4074-830d-3670799767f4',
          name: 'UAT 100x for swaps from USDC on Arbitrum',
          icon: {
            darkModeUrl:
              'https://images.ctfassets.net/9sy2a0egs6zh/1C75fPbNAj3Fn17OEYG7xh/ba381d2c30f817d99b43c87fb0b32e19/boost-swap.png',
            lightModeUrl:
              'https://images.ctfassets.net/9sy2a0egs6zh/1C75fPbNAj3Fn17OEYG7xh/ba381d2c30f817d99b43c87fb0b32e19/boost-swap.png',
          },
          boostBips: 990000,
          seasonLong: true,
          backgroundColor: '#190066',
        },
        {
          id: '6cc1c064-7175-4c67-8bfd-12c8e6e1b263',
          name: '2x points for swaps on Linea',
          icon: {
            darkModeUrl:
              'https://images.ctfassets.net/9sy2a0egs6zh/3BkCNKZ7lQnlUcCcZF2ZVa/1424f2da46efe7e316b2abcae707b570/boost-linea.png',
            lightModeUrl:
              'https://images.ctfassets.net/9sy2a0egs6zh/3BkCNKZ7lQnlUcCcZF2ZVa/1424f2da46efe7e316b2abcae707b570/boost-linea.png',
          },
          boostBips: 10000,
          seasonLong: true,
          backgroundColor: '#190066',
        },
        {
          id: 'd12df875-4da2-47f6-8175-694484455cc9',
          name: '1.5x points for swaps on mobile',
          icon: {
            darkModeUrl:
              'https://images.ctfassets.net/9sy2a0egs6zh/4IX2A8IikwpsmQQG4rlvSi/7ad21afb10390257717c61c5632c1390/boost-mobile.png',
            lightModeUrl:
              'https://images.ctfassets.net/9sy2a0egs6zh/4IX2A8IikwpsmQQG4rlvSi/7ad21afb10390257717c61c5632c1390/boost-mobile.png',
          },
          boostBips: 5000,
          seasonLong: true,
          backgroundColor: '#3D065F',
        },
      ],
    },
    responseCode: 200,
  });
};

const setupSeasonPointsEventsMock = async (
  mockServer: Mockttp,
  customResponse?: unknown,
) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: `${REWARDS_API_BASE_URL}/seasons/f3f0ccae-33e9-4256-b5d9-c42105570fa5/points-events`,
    responseCode: 200,
    response: customResponse || POINTS_EVENTS_AFTER_ONBOARDING,
  });
};

const setupMobileOptinMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: `${REWARDS_API_BASE_URL}/auth/mobile-optin`,
    response: {
      sessionId: 'Oys8JRBJe3+UY9ghKDf8e99XcSyWGvTlV6wyPCG89HM=',
      accessToken: 'Oys8JRBJe3+UY9ghKDf8e99XcSyWGvTlV6wyPCG89HM=',
      subscription: {
        id: `${SUBSCRIPTION_ID}`,
        createdAt: '2025-10-06T11:40:37.929Z',
        updatedAt: '2025-10-06T11:40:37.929Z',
        referralCode: '2PCRJR',
        accounts: [
          {
            id: 1950,
            address: DEFAULT_FIXTURE_ACCOUNT.toLowerCase(),
            blockchain: 1,
            subscriptionId: `${SUBSCRIPTION_ID}`,
            createdAt: '2025-10-06T11:40:37.929Z',
            updatedAt: '2025-10-06T11:40:37.929Z',
          },
        ],
      },
    },
    responseCode: 200,
  });
};

const setupMobileLoginMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: `${REWARDS_API_BASE_URL}/auth/mobile-login`,
    response: {
      sessionId: 'Oys8JRBJe3+UY9ghKDf8e99XcSyWGvTlV6wyPCG89HM=',
      accessToken: 'Oys8JRBJe3+UY9ghKDf8e99XcSyWGvTlV6wyPCG89HM=',
      subscription: {
        id: `${SUBSCRIPTION_ID}`,
        createdAt: '2025-10-06T11:40:37.929Z',
        updatedAt: '2025-10-06T11:40:37.929Z',
        referralCode: '2PCRJR',
        accounts: [
          {
            id: 1950,
            address: DEFAULT_FIXTURE_ACCOUNT.toLowerCase(),
            blockchain: 1,
            subscriptionId: `${SUBSCRIPTION_ID}`,
            createdAt: '2025-10-06T11:40:37.929Z',
            updatedAt: '2025-10-06T11:40:37.929Z',
          },
        ],
      },
    },
    responseCode: 201,
  });
};

const setupMobileLoginUnauthorizedMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: `${REWARDS_API_BASE_URL}/auth/mobile-login`,
    response: { error: 'Unauthorized' },
    responseCode: 401,
  });
};

export const setUpRewardsOnboardingMocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    rewardsEnabled: { enabled: true, minimumVersion: '7.57.0' },
  });
  await setupGeolocationMock(mockServer);
  await setupRewardsOisMock(mockServer);
  await setupMobileOptinMock(mockServer);
  await setupSeasonStatusMock(mockServer);
  await setupActiveBoostsMock(mockServer);
  await setupMobileLoginUnauthorizedMock(mockServer);
  await setupSeasonPointsEventsMock(mockServer, POINTS_EVENTS_AFTER_ONBOARDING);
};

export const setUpActivityMocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    rewardsEnabled: { enabled: true, minimumVersion: '7.57.0' },
  });
  await setupGeolocationMock(mockServer);
  await setupRewardsOisMock(mockServer);
  await setupMobileLoginMock(mockServer);
  await setupSeasonStatusMock(mockServer, SEASON_STATUS_RESPONSE);
  await setupSeasonPointsEventsMock(mockServer, POINTS_EVENTS_MOCK);
  await setupActiveBoostsMock(mockServer);
};
