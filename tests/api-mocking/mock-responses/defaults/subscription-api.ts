import { MockEventsObject } from '../../../framework';

/**
 * Default mock for SubscriptionService `GET /v1/subscriptions`.
 *
 * Signed-in sessions fetch this from SubscriptionController (Money surfaces
 * and the Plus charge retry after a Money deposit confirms). The response
 * matches `GetSubscriptionsResponseStruct` with no subscriptions, which is
 * the controller's default state.
 *
 * Covers dev, uat, and prod hosts. A test that needs a Plus subscription
 * overrides this with a test-specific mock.
 */
const SUBSCRIPTION_LIST_URL =
  /^https:\/\/subscription\.(?:dev-api|uat-api|api)\.cx\.metamask\.io\/v1\/subscriptions(?:\?.*)?$/;

export const SUBSCRIPTION_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: SUBSCRIPTION_LIST_URL,
      responseCode: 200,
      response: {
        subscriptions: [],
        trialedProducts: [],
      },
    },
  ],
};
