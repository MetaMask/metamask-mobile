import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { KALSHI_DEVICE_AUTH_HEADER } from '../../auth/kalshiDeviceAuthEnvelope';
import {
  checkOnboardingSigningRequest,
  type OnboardingPolicyRule,
} from '../../auth/signing/kalshiOnboardingPolicy';
import {
  balanceRequest,
  enrollmentCurrentRequest,
  enrollmentIntentRequest,
  linkRequest,
  linkVerifyRequest,
  walletRegisterRequest,
  type KalshiWalletNetwork,
} from '../../auth/signing/kalshiOnboardingTemplates';
import {
  parseSignatureRequired,
  type VenueRequest,
} from '../../auth/signing/venueRequest';
import {
  parseKalshiActivate,
  parseKalshiDemoKyc,
  parseKalshiEnrollmentIntent,
  parseKalshiLinkVerify,
  parseKalshiOnboardingStatus,
  type KalshiOnboardingState,
  type KalshiOnboardingStatus,
} from '../../contracts/v1/onboarding';

const ONBOARDING_SEGMENTS = ['v1', 'venues', 'kalshi', 'onboarding'] as const;

/** A predict-api onboarding failure. `code` is the body `code`, when sent. */
export class KalshiOnboardingHttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterSec?: number;

  constructor(status: number, code?: string, retryAfterSec?: number) {
    super(`Kalshi onboarding request failed with status ${status}.`);
    this.name = 'KalshiOnboardingHttpError';
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

/** The phone refused to sign. Nothing was sent with a signature. */
export class KalshiOnboardingPolicyError extends Error {
  readonly rule: OnboardingPolicyRule | 'signing_unavailable';

  constructor(rule: OnboardingPolicyRule | 'signing_unavailable') {
    super(`Kalshi onboarding request was not signed: ${rule}.`);
    this.name = 'KalshiOnboardingPolicyError';
    this.rule = rule;
  }
}

export interface KalshiOnboardingClientOptions {
  baseUrl?: string;
  clientVersion: string;
  fetch?: typeof fetch;
  getBearerToken: () => Promise<string | undefined>;
  /** `@authority` this build signs. A 428 naming another one is refused. */
  authority: string;
  /**
   * Signs the phone-built requests in the Engine and returns the
   * `Kalshi-Device-Auth` header, or undefined when signing is unavailable.
   * The key and A2T never reach this client.
   */
  signRequests: (
    requests: readonly VenueRequest[],
  ) => Promise<string | undefined>;
  /** Drops the cached A2T after `venue_auth_invalid`. */
  invalidateSigningSession: () => void;
}

interface RawResponse {
  status: number;
  body: unknown;
  retryAfterSec?: number;
}

const bodyCode = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null || !('code' in body)) {
    return undefined;
  }
  const { code } = body as { code: unknown };
  return typeof code === 'string' ? code : undefined;
};

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
};

const toHttpError = (response: RawResponse): KalshiOnboardingHttpError =>
  new KalshiOnboardingHttpError(
    response.status,
    bodyCode(response.body),
    response.retryAfterSec,
  );

/**
 * predict-api Kalshi onboarding routes. A device-signed route is called
 * first without `Kalshi-Device-Auth`. predict-api answers 428 with the exact
 * calls it plans to send. The phone accepts them only when they equal the
 * requests it built from its own inputs, signs its own copies, and retries
 * once. A second 428 is an error.
 */
export class KalshiOnboardingClient {
  readonly #options: KalshiOnboardingClientOptions;
  readonly #fetch: typeof fetch;

  constructor(options: KalshiOnboardingClientOptions) {
    this.#options = options;
    this.#fetch = options.fetch ?? global.fetch;
  }

  async getStatus(): Promise<KalshiOnboardingStatus> {
    const value = await this.#signedCall('GET', ['status'], undefined, [
      balanceRequest(),
      enrollmentCurrentRequest(),
    ]);
    const status = parseKalshiOnboardingStatus(value);
    Logger.log('PredictNext: Kalshi onboarding status', {
      state: status.state,
      intentStatus: status.intentStatus,
      expireTs: status.expireTs,
    });
    return status;
  }

  async createIntent(idempotencyKey: string) {
    const value = await this.#signedCall(
      'POST',
      ['intents'],
      { idempotencyKey },
      [enrollmentIntentRequest(idempotencyKey)],
    );
    const intent = parseKalshiEnrollmentIntent(value);
    Logger.log('PredictNext: Kalshi onboarding intent', {
      intentStatus: intent.intentStatus,
      supersededPrevious: intent.supersededPrevious,
      expireTs: intent.expireTs,
    });
    return intent;
  }

  async submitEmail(email: string, idempotencyKey: string): Promise<void> {
    await this.#signedCall('POST', ['link'], { email, idempotencyKey }, [
      linkRequest(email, idempotencyKey),
    ]);
  }

  async verifyCode(code: string, idempotencyKey: string) {
    const value = await this.#signedCall(
      'POST',
      ['link', 'verify'],
      { code, idempotencyKey },
      [linkVerifyRequest(code, idempotencyKey)],
    );
    return parseKalshiLinkVerify(value);
  }

  /** Bearer only. The server resolves the Kalshi user from the JWT. */
  async runDemoKyc(): Promise<{ state: KalshiOnboardingState }> {
    const response = await this.#send('POST', ['demo-kyc'], undefined);
    if (response.status !== 200) {
      throw toHttpError(response);
    }
    return parseKalshiDemoKyc(response.body);
  }

  /** `walletAddress` must be the address the user confirmed on screen. */
  async activate(
    walletAddress: string,
    network: KalshiWalletNetwork,
    idempotencyKey: string,
  ) {
    const value = await this.#signedCall(
      'POST',
      ['activate'],
      { walletAddress, network, idempotencyKey },
      [walletRegisterRequest({ walletAddress, network, idempotencyKey })],
    );
    return parseKalshiActivate(value);
  }

  async #signedCall(
    method: 'GET' | 'POST',
    route: readonly string[],
    body: Record<string, string> | undefined,
    expected: readonly VenueRequest[],
  ): Promise<unknown> {
    const unsigned = await this.#send(method, route, body);
    if (unsigned.status !== 428) {
      return this.#accept(unsigned);
    }

    const required = parseSignatureRequired(unsigned.body);
    if (!required) {
      throw toHttpError(unsigned);
    }
    const policy = checkOnboardingSigningRequest(
      required,
      expected,
      this.#options.authority,
    );
    if (!policy.ok) {
      Logger.log('PredictNext: Kalshi onboarding policy refused', policy.rule);
      throw new KalshiOnboardingPolicyError(policy.rule);
    }

    const attempt = async (retried: boolean): Promise<unknown> => {
      const header = await this.#deviceAuth(policy.requests);
      const signed = await this.#send(method, route, body, header);
      if (
        !retried &&
        signed.status === 403 &&
        bodyCode(signed.body) === 'venue_auth_invalid'
      ) {
        this.#options.invalidateSigningSession();
        return attempt(true);
      }
      if (signed.status === 428) {
        throw toHttpError(signed);
      }
      return this.#accept(signed);
    };

    return attempt(false);
  }

  async #deviceAuth(requests: readonly VenueRequest[]): Promise<string> {
    const header = await this.#options.signRequests(requests);
    if (!header) {
      throw new KalshiOnboardingPolicyError('signing_unavailable');
    }
    return header;
  }

  #accept(response: RawResponse): unknown {
    if (response.status >= 200 && response.status < 300) {
      return response.body;
    }
    throw toHttpError(response);
  }

  async #send(
    method: 'GET' | 'POST',
    route: readonly string[],
    body: Record<string, string> | undefined,
    deviceAuth?: string,
  ): Promise<RawResponse> {
    const bearerToken = await this.#resolveBearerToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'x-metamask-clientproduct': 'metamask-mobile',
      'x-metamask-clientversion': this.#options.clientVersion,
      Authorization: `Bearer ${bearerToken}`,
    };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }
    if (deviceAuth) {
      headers[KALSHI_DEVICE_AUTH_HEADER] = deviceAuth;
    }

    const response = await this.#fetch(this.#url(route), {
      method,
      headers,
      ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
    });
    const text = await response.text();
    let parsed: unknown;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (response.ok) {
          throw new KalshiOnboardingHttpError(response.status);
        }
      }
    }
    // Route, status and error code only. Never bodies, codes or tokens.
    Logger.log('PredictNext: Kalshi onboarding response', {
      method,
      route: route.join('/'),
      signed: Boolean(deviceAuth),
      status: response.status,
      code: bodyCode(parsed),
    });
    return {
      status: response.status,
      body: parsed,
      retryAfterSec: parseRetryAfter(response.headers.get('Retry-After')),
    };
  }

  async #resolveBearerToken(): Promise<string> {
    const token = await this.#options
      .getBearerToken()
      .catch((error: unknown) => {
        Logger.error(
          ensureError(error, 'KalshiOnboardingClient.resolveBearerToken'),
          'PredictNext: failed to get the Predict API bearer token',
        );
        return undefined;
      });
    if (!token?.trim()) {
      throw new KalshiOnboardingHttpError(401);
    }
    return token;
  }

  #url(route: readonly string[]): string {
    const { baseUrl } = this.#options;
    if (!baseUrl) {
      throw new KalshiOnboardingHttpError(503);
    }
    let base: URL;
    try {
      base = new URL(baseUrl);
    } catch {
      throw new KalshiOnboardingHttpError(503);
    }
    base.pathname = `${base.pathname.replace(/\/$/u, '')}/`;
    return new URL(
      [...ONBOARDING_SEGMENTS, ...route].map(encodeURIComponent).join('/'),
      base,
    ).toString();
  }
}
