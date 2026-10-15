import type { TraderProfileResponse } from '@metamask/social-controllers';
import { MockEventsObject } from '../../../framework';

/**
 * Hosts used by builds.yml (`main-e2e` → social.dev-api; prod → social.api).
 * Match all environments so Appium smoke cleanup does not fail on unmocked
 * SocialService traffic when SOCIAL_API_URL points at dev-api.
 */
const SOCIAL_HOST = String.raw`https:\/\/social\.(?:dev-api|api|uat-api)\.cx\.metamask\.io`;

/** Empty leaderboard — valid for E2E that never open Social UI. */
const EMPTY_LEADERBOARD = { traders: [] };

/** Minimal profile so background SocialService fetches do not 404. */
const EMPTY_TRADER_PROFILE: TraderProfileResponse = {
  profile: {
    profileId: 'e2e-mock-trader',
    address: '0x0000000000000000000000000000000000000001',
    allAddresses: ['0x0000000000000000000000000000000000000001'],
    name: 'e2e-mock',
    imageUrl: null,
  },
  stats: {
    pnl30d: 0,
    winRate30d: 0,
    roiPercent30d: 0,
    tradeCount30d: 0,
    pnl7d: 0,
    winRate7d: 0,
    roiPercent7d: 0,
    tradeCount7d: 0,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
    perChainPnl7d: {},
    perChainRoi7d: {},
    perChainVolume7d: {},
  },
  socialHandles: {},
  followerCount: 0,
  followingCount: 0,
  copytradedAllTime: {
    count: 0,
    volumeUSD: 0,
    distinctActors: 0,
  },
};

/** PositionsResponse shape (`positions` array). */
const EMPTY_POSITIONS = { positions: [] };

export const SOCIAL_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: new RegExp(
        `^${SOCIAL_HOST}\\/api\\/v1\\/leaderboard(?:\\?.*)?$`,
      ),
      responseCode: 200,
      response: EMPTY_LEADERBOARD,
    },
    {
      urlEndpoint: new RegExp(
        `^${SOCIAL_HOST}\\/api\\/v1\\/users\\/me\\/following(?:\\?.*)?$`,
      ),
      responseCode: 200,
      response: {
        following: [],
        count: 0,
      },
    },
    {
      urlEndpoint: new RegExp(
        `^${SOCIAL_HOST}\\/api\\/v1\\/traders\\/[^/]+\\/profile(?:\\?.*)?$`,
      ),
      responseCode: 200,
      response: EMPTY_TRADER_PROFILE,
    },
    {
      urlEndpoint: new RegExp(
        `^${SOCIAL_HOST}\\/api\\/v2\\/traders\\/[^/]+\\/positions\\/open(?:\\?.*)?$`,
      ),
      responseCode: 200,
      response: EMPTY_POSITIONS,
    },
    {
      urlEndpoint: new RegExp(
        `^${SOCIAL_HOST}\\/api\\/v1\\/traders\\/[^/]+\\/positions\\/closed(?:\\?.*)?$`,
      ),
      responseCode: 200,
      response: EMPTY_POSITIONS,
    },
  ],
};
