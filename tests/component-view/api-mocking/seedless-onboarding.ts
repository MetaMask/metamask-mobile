/**
 * Seedless onboarding auth-server mocks for component view tests.
 *
 * Intercepts OAuth marketing opt-in HTTP calls made by OAuthService
 * (ChoosePassword post-wallet creation, OAuthRehydration post-unlock sync).
 *
 * E2E uses mockttp with a broader surface (token, metadata, SSS nodes); CV tests
 * focus on views that call fetch against the auth server marketing endpoints.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { restoreFetchPath, stubFetchPath } from './fetchStub';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

/** Auth server origins used across dev / UAT / prod OAuth config. */
export const SEEDLESS_AUTH_SERVER_ORIGINS = [
  'https://auth-service.dev-api.cx.metamask.io',
  'https://auth-service.uat-api.cx.metamask.io',
  'https://auth-service.api.cx.metamask.io',
] as const;

const MARKETING_OPT_IN_PATH = '/api/v1/oauth/marketing_opt_in_status';

/** One request answered by the auth-server marketing stubs. */
export interface SeedlessAuthServerRequest {
  method: string;
  body: unknown;
}

let authServerRequests: SeedlessAuthServerRequest[] = [];

/** Requests answered by the marketing stubs since the last setup, in order. */
export function getSeedlessAuthServerRequests(): readonly SeedlessAuthServerRequest[] {
  return authServerRequests;
}

const recordAuthServerRequest = (request: {
  method: string;
  body: unknown;
}): void => {
  let body: unknown = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body) as unknown;
    } catch {
      // Keep the raw string when the body is not JSON.
    }
  }
  authServerRequests = [
    ...authServerRequests,
    { method: request.method, body },
  ];
};

export interface SeedlessAuthServerMockOptions {
  /** Response body for GET/POST marketing opt-in (default: true). */
  marketingOptIn?: boolean;
  /** When true, POST marketing opt-in returns HTTP 500. */
  marketingPostFails?: boolean;
}

export function setupSeedlessAuthServerMocks(
  options: SeedlessAuthServerMockOptions = {},
): void {
  clearSeedlessAuthServerMocks();
  disableNetConnect();

  const marketingOptIn = options.marketingOptIn ?? true;
  const marketingBody = { is_opt_in: marketingOptIn };
  const postStatus = options.marketingPostFails ? 500 : 200;

  for (const origin of SEEDLESS_AUTH_SERVER_ORIGINS) {
    nock(origin).persist().get(MARKETING_OPT_IN_PATH).reply(200, marketingBody);

    nock(origin)
      .persist()
      .post(MARKETING_OPT_IN_PATH)
      .reply(postStatus, marketingBody);

    // OAuthService (updateMarketingOptInStatus / getMarketingOptInStatus)
    // calls global fetch (undici), which a nock interceptor does not always
    // settle. Register the same payloads for the fetch stub, per method, so
    // the GET keeps answering the stored server value while the POST honours
    // `marketingPostFails`.
    stubFetchPath(origin, MARKETING_OPT_IN_PATH, marketingBody, 200, {
      method: 'GET',
      onRequest: recordAuthServerRequest,
    });
    stubFetchPath(origin, MARKETING_OPT_IN_PATH, marketingBody, postStatus, {
      method: 'POST',
      onRequest: recordAuthServerRequest,
    });
  }
}

export function clearSeedlessAuthServerMocks(): void {
  teardownNock();
  authServerRequests = [];
  for (const origin of SEEDLESS_AUTH_SERVER_ORIGINS) {
    restoreFetchPath(origin, MARKETING_OPT_IN_PATH);
  }
}
