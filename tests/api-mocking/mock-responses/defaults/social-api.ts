import { MockEventsObject } from '../../../framework';

// E2E builds point SOCIAL_API_URL at the dev host (see builds.yml), while
// production uses social.api. Match both so mocks apply to either build.
const SOCIAL_API_HOST = String.raw`https:\/\/social\.(?:dev-)?api\.cx\.metamask\.io`;

const socialApiUrl = (path: string, allowQuery = true): RegExp =>
  new RegExp(
    `^${SOCIAL_API_HOST}${path}${allowQuery ? '(?:\\?.*)?' : ''}$`,
    'u',
  );

// Responses are superstruct-validated by @metamask/social-controllers, so every
// required field must be present. `type()` structs ignore extra keys but reject
// missing ones, and empty arrays satisfy the collection fields.
const EMPTY_POSITIONS_RESPONSE = {
  positions: [],
  pagination: { hasMore: false },
  computedAt: null,
};

const EMPTY_TRADER_PROFILE_RESPONSE = {
  profile: {
    profileId: 'e2e-profile',
    address: '0x0000000000000000000000000000000000000000',
    allAddresses: ['0x0000000000000000000000000000000000000000'],
    name: 'E2E Trader',
    imageUrl: null,
  },
  stats: {},
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
  },
  socialHandles: {},
  followerCount: 0,
  followingCount: 0,
};

export const SOCIAL_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: socialApiUrl(String.raw`\/api\/v1\/leaderboard`),
      responseCode: 200,
      response: {
        traders: [],
      },
    },
    {
      urlEndpoint: socialApiUrl(String.raw`\/api\/v1\/users\/me\/following`),
      responseCode: 200,
      response: {
        following: [],
        count: 0,
      },
    },
    {
      urlEndpoint: socialApiUrl(String.raw`\/api\/v1\/traders\/[^/]+\/profile`),
      responseCode: 200,
      response: EMPTY_TRADER_PROFILE_RESPONSE,
    },
    {
      urlEndpoint: socialApiUrl(
        String.raw`\/api\/v1\/traders\/[^/]+\/positions\/closed`,
      ),
      responseCode: 200,
      response: EMPTY_POSITIONS_RESPONSE,
    },
    {
      urlEndpoint: socialApiUrl(
        String.raw`\/api\/v2\/traders\/[^/]+\/positions\/open`,
      ),
      responseCode: 200,
      response: EMPTY_POSITIONS_RESPONSE,
    },
  ],
};
