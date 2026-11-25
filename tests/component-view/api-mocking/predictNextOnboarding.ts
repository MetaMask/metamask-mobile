import {
  restoreFetchPath,
  stubFetchPath,
  stubFetchPathDeferred,
  type FetchPathDeferred,
} from './fetchStub';
import { getPredictApiUrl } from '../../../app/components/UI/PredictNext/config/predictClusterUrls';
import type { KalshiOnboardingState } from '../../../app/components/UI/PredictNext/contracts/v1/onboarding';

/** Wire shape `KalshiOnboardingClient.getStatus` parses. */
export interface PredictNextOnboardingStatus {
  state: KalshiOnboardingState;
  intentStatus?: string;
  expireTs?: string | number;
  balanceDollars?: string;
}

/** Build a status body without leaking wire literals into each test. */
export const makePredictNextOnboardingStatus = (
  state: KalshiOnboardingState,
  overrides: Omit<PredictNextOnboardingStatus, 'state'> = {},
): PredictNextOnboardingStatus => ({ state, ...overrides });

export interface PredictNextOnboardingMockOptions {
  /** Initial status body. Change it with `setStatus` between reads. */
  status?: PredictNextOnboardingStatus;
  /** The enrollment-intent POST body. */
  intent?: unknown;
  /** The link POST status. */
  linkStatus?: number;
  /** The link/verify POST body. */
  verify?: unknown;
  /** The demo-kyc POST body. */
  demoKyc?: unknown;
  /** The activate POST body. */
  activate?: unknown;
  /** Observe every onboarding request, including passive GETs. */
  onRequest?: (request: { method: string; body: unknown; url: string }) => void;
}

const ONBOARDING_BASE = 'v1/venues/kalshi/onboarding';
const onboardingOrigin = (): string => {
  const origin = getPredictApiUrl();
  if (!origin) {
    throw new Error('Predict API URL is unavailable in this test environment');
  }
  return origin;
};
const onboardingPath = (route: string): string =>
  `/${ONBOARDING_BASE}/${route}`;

const ONBOARDING_ROUTES = [
  'onboarded',
  'intents',
  'link',
  'link/verify',
  'demo-kyc',
  'activate',
] as const;

/**
 * Stubs the real client's routes so the gate can run against the real
 * `KalshiOnboardingClient` and observation. Every POST has a harmless default;
 * tests that assert a write never happened should inspect `requests`.
 */
export const configurePredictNextOnboarding = (
  options: PredictNextOnboardingMockOptions = {},
): {
  origin: string;
  requests: { method: string; body: unknown; url: string }[];
  setStatus: (status: PredictNextOnboardingStatus) => void;
} => {
  const origin = onboardingOrigin();
  const requests: { method: string; body: unknown; url: string }[] = [];
  const onRequest = (request: {
    method: string;
    body: unknown;
    url: string;
  }): void => {
    requests.push(request);
    options.onRequest?.(request);
  };
  const setStatus = (status: PredictNextOnboardingStatus): void => {
    stubFetchPath(origin, onboardingPath('onboarded'), status, 200, {
      method: 'GET',
      onRequest,
    });
  };

  setStatus(options.status ?? { state: 'none' });
  stubFetchPath(
    origin,
    onboardingPath('intents'),
    options.intent ?? {
      intentStatus: 'pending',
      expireTs: Math.floor(Date.now() / 1000) + 900,
      supersededPrevious: false,
    },
    200,
    { method: 'POST', onRequest },
  );
  stubFetchPath(origin, onboardingPath('link'), {}, options.linkStatus ?? 200, {
    method: 'POST',
    onRequest,
  });
  stubFetchPath(
    origin,
    onboardingPath('link/verify'),
    options.verify ?? { verified: true },
    200,
    { method: 'POST', onRequest },
  );
  stubFetchPath(
    origin,
    onboardingPath('demo-kyc'),
    options.demoKyc ?? { state: 'kyc_review' },
    200,
    { method: 'POST', onRequest },
  );
  stubFetchPath(
    origin,
    onboardingPath('activate'),
    options.activate ?? { intentStatus: 'active' },
    200,
    { method: 'POST', onRequest },
  );

  return {
    origin,
    requests,
    setStatus,
  };
};

/** Holds the status GET open until `respond` or `fail`. */
export const configurePredictNextOnboardingDeferred = (
  options?: PredictNextOnboardingMockOptions,
): FetchPathDeferred =>
  stubFetchPathDeferred(onboardingOrigin(), onboardingPath('onboarded'), {
    method: 'GET',
    onRequest: options?.onRequest,
  });

/** Drops every onboarding stub, including a held read. */
export const resetPredictNextOnboarding = (): void => {
  const origin = onboardingOrigin();
  for (const route of ONBOARDING_ROUTES) {
    restoreFetchPath(origin, onboardingPath(route), { method: 'GET' });
    restoreFetchPath(origin, onboardingPath(route), { method: 'POST' });
    restoreFetchPath(origin, onboardingPath(route));
  }
};
