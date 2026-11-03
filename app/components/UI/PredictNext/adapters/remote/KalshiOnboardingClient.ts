import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import type { SignOperationInput } from '../../auth/signing/signOperationTypes';
import type { TemplateRule } from '../../auth/signing/venueTemplates';
import type { VenueOperationName } from '../../auth/venueSigningProfiles';
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
  sendSigned,
  VenueSigningRefusedError,
  VenueSigningUnavailableError,
  type SignOperation,
} from './signedVenueCall';

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
  readonly rule: TemplateRule | 'signing_unavailable';

  constructor(rule: TemplateRule | 'signing_unavailable') {
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
  /**
   * Renders and signs a canonical operation in the Engine from the bundled
   * signing profile, and returns the `Venue-Authorization` header. The key,
   * the A2T and the profile never reach this client. Throws `TemplateError`
   * when the profile does not allow the request, and returns undefined when
   * signing is unavailable.
   */
  signOperation: SignOperation;
  /** Drops the cached A2T after `venue_authorization_invalid`. */
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
 * predict-api Kalshi onboarding routes. A device-signed route is called once,
 * with a `Venue-Authorization` header the Engine renders and signs from its
 * bundled signing profile and the inputs the user gave (ADR-0004). This client
 * knows no venue path or body. When predict-api says the signature or the
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
    const value = await this.#signedCall(
      'GET',
      ['status'],
      undefined,
      'onboarding.status',
    );
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
      'onboarding.start',
      { inputs: { idempotencyKey } },
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
    await this.#signedCall(
      'POST',
      ['link'],
      { email, idempotencyKey },
      'onboarding.link',
      { inputs: { email, idempotencyKey } },
    );
  }

  async verifyCode(code: string, idempotencyKey: string) {
    const value = await this.#signedCall(
      'POST',
      ['link', 'verify'],
      { code, idempotencyKey },
      'onboarding.verify',
      { inputs: { code, idempotencyKey } },
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
    network: string,
    idempotencyKey: string,
  ) {
    const value = await this.#signedCall(
      'POST',
      ['activate'],
      { walletAddress, network, idempotencyKey },
      'onboarding.activate',
      { inputs: { walletAddress, network, idempotencyKey } },
    );
    return parseKalshiActivate(value);
  }

  async #signedCall(
    method: 'GET' | 'POST',
    route: readonly string[],
    body: Record<string, string> | undefined,
    operation: VenueOperationName,
    input?: SignOperationInput,
  ): Promise<unknown> {
    let response: RawResponse;
    try {
      response = await sendSigned(
        {
          signOperation: this.#options.signOperation,
          invalidateSigningSession: this.#options.invalidateSigningSession,
        },
        operation,
        input,
        (header) => this.#send(method, route, body, header),
        (raw) => ({ status: raw.status, code: bodyCode(raw.body) }),
      );
    } catch (error) {
      if (error instanceof VenueSigningRefusedError) {
        throw new KalshiOnboardingPolicyError(error.rule);
      }
      if (error instanceof VenueSigningUnavailableError) {
        throw new KalshiOnboardingPolicyError('signing_unavailable');
      }
      throw error;
    }
    return this.#accept(response);
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
