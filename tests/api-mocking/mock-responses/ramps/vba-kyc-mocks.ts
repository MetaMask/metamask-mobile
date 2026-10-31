import type { Mockttp } from 'mockttp';
import { AuthenticationController } from '@metamask/profile-sync-controller';
import { getDecodedProxiedURL } from '../../../smoke-appium/notifications/utils/helpers.ts';
import type { SeenProxiedRequest } from '../../helpers/mockHelpers.ts';

const { getE2EIdentifierFromJwt } = AuthenticationController.Mocks;

export const VBA_KYC_SESSION_ID = 'e2e-vba-kyc-session';
export const VBA_KYC_EMAIL = 'vba-kyc-e2e@example.com';
export const VBA_KYC_FALLBACK_EXTERNAL_USER_ID = 'e2e-vba-kyc-profile';

export type VbaKycScenario = 'rejected' | 'retry';

export const VBA_KYC_SESSION_STATUSES: Record<
  VbaKycScenario,
  { finalStatus: string; kycStatus: string; vendorStatus: string }
> = {
  rejected: {
    finalStatus: 'rejected',
    kycStatus: 'rejected',
    vendorStatus: 'RED_FINAL',
  },
  retry: {
    finalStatus: 'retry',
    kycStatus: 'retry',
    vendorStatus: 'RED_RETRY',
  },
};

export const buildVbaKycSessionStatus = (
  scenario: VbaKycScenario,
  externalUserId: string = VBA_KYC_FALLBACK_EXTERNAL_USER_ID,
) => ({
  id: VBA_KYC_SESSION_ID,
  externalUserId,
  vendor: 'iron',
  consentStatus: 'given',
  ...VBA_KYC_SESSION_STATUSES[scenario],
});

export const MONEY_MOVEMENT_NEOBANK_BR_FLAG = {
  moneyMovementNeobank: {
    enabled: true,
    minimumVersion: '0.0.0',
    regions: ['BR'],
    regionCurrencies: { BR: 'BRL' },
  },
};

const KYC_API_HOST = /^https:\/\/kyc-api\.(dev-|uat-)?api\.cx\.metamask\.io$/u;
const GEOLOCATION_V2_URL =
  /^https:\/\/geolocation\.(dev-|uat-)?api\.cx\.metamask\.io\/v2\/geolocation/u;
const PARTNER_IDENTITY_TOKEN_URL =
  /^https:\/\/authentication\.(dev-|uat-)?api\.cx\.metamask\.io\/api\/v2\/oidc\/token$/u;
const IDENTITY_SHARING_CONSENT_URL =
  /^https:\/\/user-storage\.(dev-|uat-)?api\.cx\.metamask\.io\/api\/v1\/preferences\/identity-sharing-consent$/u;

export const VBA_KYC_JOURNEY_PATH = `/sessions/${VBA_KYC_SESSION_ID}/journey`;
export const VBA_KYC_CREATE_SESSION_PATH = '/sessions';
const MOCK_PRIORITY = 1100;

const parseKycApiUrl = (requestUrl: string): URL | null => {
  const url = new URL(getDecodedProxiedURL(requestUrl));
  return KYC_API_HOST.test(url.origin) ? url : null;
};

const kycApiPathMatches =
  (path: string | RegExp) =>
  (request: { url: string }): boolean => {
    const url = parseKycApiUrl(request.url);
    if (!url) {
      return false;
    }
    return typeof path === 'string'
      ? url.pathname === path
      : path.test(url.pathname);
  };

const externalUserIdFromHeaders = (
  headers: Record<string, string | string[] | undefined>,
): string => {
  const authorization = headers.authorization?.toString() ?? '';
  const token = authorization.split(' ')[1];
  return token
    ? getE2EIdentifierFromJwt(token)
    : VBA_KYC_FALLBACK_EXTERNAL_USER_ID;
};

/**
 * Isolates the UKYC (kyc-api) backend for a persisted VBA KYC session.
 *
 * The session status echoes the caller's profile id so the session passes the
 * ownership check in `RampsController.hydrateVbaOnboarding`. The journey
 * (SumSub applicant token) request never resolves, so the native SumSub SDK is
 * never presented; specs count journey requests to assert whether the provider
 * launch was attempted.
 */
export const setupVbaKycMocks = async (
  mockServer: Mockttp,
  scenario: VbaKycScenario,
): Promise<void> => {
  await mockServer
    .forGet('/proxy')
    .matching((request) =>
      GEOLOCATION_V2_URL.test(getDecodedProxiedURL(request.url)),
    )
    .asPriority(MOCK_PRIORITY)
    .thenJson(200, { country: 'BR', region: null, timezone: null });

  await mockServer
    .forPost('/proxy')
    .matching((request) =>
      PARTNER_IDENTITY_TOKEN_URL.test(getDecodedProxiedURL(request.url)),
    )
    .asPriority(MOCK_PRIORITY)
    .thenJson(422, { message: 'email claim unavailable' });

  await mockServer
    .forPut('/proxy')
    .matching((request) =>
      IDENTITY_SHARING_CONSENT_URL.test(getDecodedProxiedURL(request.url)),
    )
    .asPriority(MOCK_PRIORITY)
    .thenReply(204);

  await mockServer
    .forGet('/proxy')
    .matching(
      kycApiPathMatches(
        new RegExp(
          `^/sessions/(${VBA_KYC_SESSION_ID}/status|latest/status/iron)$`,
          'u',
        ),
      ),
    )
    .asPriority(MOCK_PRIORITY)
    .thenCallback((request) => ({
      statusCode: 200,
      json: buildVbaKycSessionStatus(
        scenario,
        externalUserIdFromHeaders(request.headers),
      ),
    }));

  await mockServer
    .forGet('/proxy')
    .matching(kycApiPathMatches(/^\/vendors\/[^/]+\/disclaimers$/u))
    .asPriority(MOCK_PRIORITY)
    .thenJson(200, []);

  await mockServer
    .forGet('/proxy')
    .matching(kycApiPathMatches('/disclaimers'))
    .asPriority(MOCK_PRIORITY)
    .thenJson(200, { idOS: [], kycProvider: [] });

  const sessionDisclaimers = {
    idOS: [],
    kycProvider: [],
    credentialReusabilityConsentGiven: false,
  };

  await mockServer
    .forGet('/proxy')
    .matching(kycApiPathMatches(`/sessions/${VBA_KYC_SESSION_ID}/disclaimers`))
    .asPriority(MOCK_PRIORITY)
    .thenJson(200, sessionDisclaimers);

  await mockServer
    .forPost('/proxy')
    .matching(kycApiPathMatches(`/sessions/${VBA_KYC_SESSION_ID}/disclaimers`))
    .asPriority(MOCK_PRIORITY)
    .thenJson(200, sessionDisclaimers);

  await mockServer
    .forPost('/proxy')
    .matching(kycApiPathMatches(VBA_KYC_JOURNEY_PATH))
    .asPriority(MOCK_PRIORITY)
    .thenTimeout();

  await mockServer
    .forPost('/proxy')
    .matching(kycApiPathMatches(VBA_KYC_CREATE_SESSION_PATH))
    .asPriority(MOCK_PRIORITY)
    .thenJson(409, { message: 'session creation is not expected' });
};

export const isVbaKycJourneyRequest = (request: SeenProxiedRequest): boolean =>
  request.method === 'POST' &&
  request.proxiedUrl.includes('kyc-api.') &&
  new URL(request.proxiedUrl).pathname === VBA_KYC_JOURNEY_PATH;

export const isVbaKycSessionCreateRequest = (
  request: SeenProxiedRequest,
): boolean =>
  request.method === 'POST' &&
  request.proxiedUrl.includes('kyc-api.') &&
  new URL(request.proxiedUrl).pathname === VBA_KYC_CREATE_SESSION_PATH;
