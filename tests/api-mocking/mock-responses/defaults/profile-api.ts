import { MockEventsObject } from '../../../framework';

/**
 * Match all profile API environments so Appium smoke cleanup does not fail on
 * the early-access check a signed-in wallet makes on unlock.
 */
const PROFILE_HOST = String.raw`https:\/\/profile\.(?:dev-api|api|uat-api)\.cx\.metamask\.io`;

export const PROFILE_API_MOCKS: MockEventsObject = {
  GET: [
    {
      // Not enrolled, so E2E wallets keep the TSA-1122 bucket experience.
      urlEndpoint: new RegExp(
        `^${PROFILE_HOST}\\/v1\\/early-access(?:\\?.*)?$`,
      ),
      responseCode: 200,
      response: { hasAccess: false },
    },
  ],
};
