import { MockEventsObject } from '../../../framework';

export const SOCIAL_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/social\.api\.cx\.metamask\.io\/api\/v1\/leaderboard(?:\?.*)?$/,
      responseCode: 200,
      response: {
        traders: [],
      },
    },
    {
      urlEndpoint:
        /^https:\/\/social\.api\.cx\.metamask\.io\/api\/v1\/users\/me\/following(?:\?.*)?$/,
      responseCode: 200,
      response: {
        following: [],
        count: 0,
      },
    },
  ],
};
