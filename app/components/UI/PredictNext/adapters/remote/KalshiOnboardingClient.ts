import { v4 as uuidv4 } from 'uuid';
import { ensureError } from '../../../../../util/errorUtils';

import Logger from '../../../../../util/Logger';
import {
  parseKalshiActivate,
  parseKalshiDemoKyc,
  parseKalshiEnrollmentIntent,
  parseKalshiLinkVerify,
  parseKalshiOnboardingStatus,
  type KalshiOnboardingState,
  type KalshiOnboardingStatus,
} from '../../contracts/v1/onboarding';
import {
  buildOnboardingVenueAuthorization,
  signOnboardingRequest,
  VENUE_AUTHORIZATION_HEADER,
  type OnboardingSignedRequest,
  type OnboardingSigningContext,
} from './kalshiOnboardingSigner';

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
  readonly rule: 'signing_unavailable';

  constructor(rule: 'signing_unavailable') {
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
  /** The A2T the `Authorization` header carries, or undefined without one. */
  getA2t: () => Promise<string | undefined>;
  /** Loads or creates the device key material, or null when unavailable. */
  getDeviceKey: () => Promise<{
    publicKey: string;
    salt: string;
  } | null>;
  /** Signs the exact signing-base bytes with the profile's device key. */
  signDeviceProof: (message: Uint8Array) => Promise<Uint8Array>;
  /** Drops the cached A2T after `venue_authorization_invalid`. */
  invalidateA2t: () => void;
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

/** `{onboarded:true}` — the balance probe succeeded. */
const isOnboardedPayload = (value: unknown): value is { onboarded: true } =>
  typeof value === 'object' &&
  value !== null &&
  'onboarded' in value &&
  value.onboarded === true;

/** What one response says about a stale signature or A2T. */
interface SignedAttempt {
  status: number;
  code?: string;
}

/**
 * A signature expired in flight, or the A2T went stale. Signing again is
 * correct once, and a second failure is the caller's error.
 */
const isRenewable = (attempt: SignedAttempt): boolean =>
  (attempt.status === 403 && attempt.code === 'venue_authorization_invalid') ||
  (attempt.status === 409 && attempt.code === 'venue_signature_expired');

/**
 * predict-api Kalshi onboarding routes. Each route is one fixed upstream
 * request; the client builds its exact bytes, signs them directly with the
 * phone's device key (no request templates), and attaches the
 * `Venue-Authorization` header. When predict-api says the signature or the
 * A2T is stale, it signs again and retries once.
 */
export class KalshiOnboardingClient {
  readonly #options: KalshiOnboardingClientOptions;
  readonly #fetch: typeof fetch;

  constructor(options: KalshiOnboardingClientOptions) {
    this.#options = options;
    this.#fetch = options.fetch ?? global.fetch;
  }

  async getStatus(): Promise<KalshiOnboardingStatus> {
    const value = await this.#signedCall({
      method: 'GET',
      route: ['onboarded'],
      // The temporary onboarded probe: the server verifies one envelope
      // covering both requests it may relay — the enrollment-intent read
      // first, then the balance probe it only sends on ACTIVATED.
      request: {
        method: 'GET',
        path: '/trade-api/v2/isv/enrollment/intents/current',
        query: '',
        body: '',
      },
      alsoSign: [
        {
          method: 'GET',
          path: '/trade-api/v2/portfolio/balance',
          query: '',
          body: '',
        },
      ],
    });
    // `{onboarded: true}` means the balance probe ran; translate it, but
    // keep the optional balanceDollars the server sends alongside it.
    const status = parseKalshiOnboardingStatus(
      isOnboardedPayload(value) ? { state: 'active', ...value } : value,
    );
    Logger.log('PredictNext: Kalshi onboarding status', {
      state: status.state,
      intentStatus: status.intentStatus,
      expireTs: status.expireTs,
      balanceDollars: status.balanceDollars,
    });
    return status;
  }

  async createIntent(idempotencyKey: string) {
    const value = await this.#signedCall({
      method: 'POST',
      route: ['intents'],
      request: {
        method: 'POST',
        path: '/trade-api/v2/isv/enrollment/intents',
        query: '',
        body: '',
        idempotencyKey,
      },
      body: { idempotencyKey },
    });
    const intent = parseKalshiEnrollmentIntent(value);
    Logger.log('PredictNext: Kalshi onboarding intent', {
      intentStatus: intent.intentStatus,
      supersededPrevious: intent.supersededPrevious,
      expireTs: intent.expireTs,
    });
    return intent;
  }

  async submitEmail(email: string, idempotencyKey: string): Promise<void> {
    await this.#signedCall({
      method: 'POST',
      route: ['link'],
      request: {
        method: 'POST',
        path: '/trade-api/v2/isv/users/link',
        query: '',
        body: JSON.stringify({ email }),
        idempotencyKey,
      },
      body: { email, idempotencyKey },
    });
  }

  async verifyCode(code: string, idempotencyKey: string) {
    const value = await this.#signedCall({
      method: 'POST',
      route: ['link', 'verify'],
      request: {
        method: 'POST',
        path: '/trade-api/v2/isv/users/link/verify',
        query: '',
        body: JSON.stringify({ code }),
        idempotencyKey,
      },
      body: { code, idempotencyKey },
    });
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
    network: string,
    idempotencyKey: string,
  ) {
    const value = await this.#signedCall({
      method: 'POST',
      route: ['activate'],
      request: {
        method: 'POST',
        path: '/trade-api/v2/isv/wallet/register',
        query: '',
        body: JSON.stringify({ wallet_address: walletAddress, network }),
        idempotencyKey,
      },
      body: {
        walletAddress,
        network,
        idempotencyKey,
      },
    });
    return parseKalshiActivate(value);
  }

  async #resolveContext(): Promise<OnboardingSigningContext> {
    const [a2t, key] = await Promise.all([
      this.#options.getA2t(),
      this.#options.getDeviceKey(),
    ]);
    if (!a2t?.trim() || !key) {
      throw new KalshiOnboardingPolicyError('signing_unavailable');
    }
    return { a2t, deviceKey: key.publicKey, salt: key.salt };
  }

  async #signedCall(input: {
    method: 'GET' | 'POST';
    route: readonly string[];
    request: OnboardingSignedRequest;
    /** Extra upstream requests the server relays under the same envelope. */
    alsoSign?: readonly OnboardingSignedRequest[];
    /**
     * DTO fields the server re-derives and matches against the envelope
     * `values`, byte for byte. The same JSON goes in the HTTP body.
     */
    body?: Record<string, string>;
  }): Promise<unknown> {
    const send = async (): Promise<RawResponse> => {
      const context = await this.#resolveContext();
      const signatures = await Promise.all(
        [input.request, ...(input.alsoSign ?? [])].map((request) =>
          signOnboardingRequest(request, context, {
            sign: this.#options.signDeviceProof,
            requestId: () => uuidv4(),
            now: () => Math.floor(Date.now() / 1000),
          }),
        ),
      );
      const header = {
        name: VENUE_AUTHORIZATION_HEADER,
        value: buildOnboardingVenueAuthorization({
          step: 'default',
          context,
          values: input.body,
          signatures,
        }),
      };
      return this.#send(
        input.method,
        input.route,
        input.body && { ...input.body },
        header,
      );
    };
    const response = await this.#sendOnceThenRetry(send);
    return this.#accept(response);
  }

  // One round trip: the signed call is the first call. A response that says
  // the signature or the A2T is stale is signed again and sent once more.
  async #sendOnceThenRetry(
    send: () => Promise<RawResponse>,
  ): Promise<RawResponse> {
    const first = await send();
    const attempt: SignedAttempt = {
      status: first.status,
      code: bodyCode(first.body),
    };
    if (!isRenewable(attempt)) {
      return first;
    }
    if (attempt.code === 'venue_authorization_invalid') {
      try {
        this.#options.invalidateA2t();
      } catch (error) {
        Logger.error(
          ensureError(error, 'KalshiOnboardingClient.invalidateA2t'),
          'PredictNext: failed to invalidate the A2T',
        );
      }
    }
    return send();
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
    deviceAuth?: { name: string; value: string },
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
      headers[deviceAuth.name] = deviceAuth.value;
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
