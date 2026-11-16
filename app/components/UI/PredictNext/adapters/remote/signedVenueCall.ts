import Logger from '../../../../../util/Logger';
import {
  TemplateError,
  type TemplateRule,
} from '../../auth/signing/profileTemplates';
import type {
  DeviceAuthHeader,
  SignOperationInput,
  SignedOperation,
} from '../../auth/signing/signOperationTypes';
import type { VenueIntentName } from '../../auth/venueSigningProfiles';

/** Signs one canonical operation. Provided by the Engine. Returns the
 * envelope header plus the exact body bytes the signature covers; the
 * caller sends those bytes verbatim. */
export type SignOperation = (
  intent: VenueIntentName,
  input?: SignOperationInput,
) => Promise<SignedOperation | undefined>;

/** The upstream GET a server proposal asked the phone to sign. */
export interface ProposedRead {
  method: string;
  path: string;
  query: string;
  /** Server challenge signed as the device request ID and signature nonce. */
  requestId?: string;
}

/**
 * Signs one server-proposed read. Provided by the Engine, which checks the
 * read against the profile's allowlist itself. Throws `TemplateError` when
 * the proposal is not allowed; undefined means signing is unavailable.
 */
export type SignRead = (
  proposed: ProposedRead,
) => Promise<DeviceAuthHeader | undefined>;

/** The phone's profile refused this proposal, which was not signed. An
 * earlier call in the same exchange may already have been dispatched. */
export class VenueSigningRefusedError extends Error {
  readonly rule: TemplateRule;
  /** Any send in this exchange, including a prior renewal attempt. */
  readonly requestSent: boolean;

  constructor(rule: TemplateRule, requestSent = false) {
    super(`Venue request was not signed: ${rule}.`);
    this.name = 'VenueSigningRefusedError';
    this.rule = rule;
    this.requestSent = requestSent;
  }
}

/** Signing is not available: disabled, locked, signed out, or no A2T. */
export class VenueSigningUnavailableError extends Error {
  /** Any send in this exchange, including the bearer-only read. */
  readonly requestSent: boolean;

  constructor(requestSent = false) {
    super('Venue request signing is unavailable.');
    this.name = 'VenueSigningUnavailableError';
    this.requestSent = requestSent;
  }
}

/** Read work paused after the bounded signed calls; server scan progress
 * remains authoritative and a later observation can continue it. */
export class VenueReadBudgetExhaustedError extends Error {
  readonly requestSent = true;

  constructor() {
    super('Venue read signature budget exhausted; observation is deferred.');
    this.name = 'VenueReadBudgetExhaustedError';
  }
}

export interface SignedVenueCallDependencies {
  signOperation: SignOperation;
  /** Drops the cached A2T after `venue_authorization_invalid`. */
  invalidateSigningSession: () => void;
}

export interface SignedReadDependencies {
  signRead: SignRead;
  /** Drops the cached A2T after `venue_authorization_invalid`. */
  invalidateSigningSession: () => void;
}

/** What `sendSigned` and `sendSignedRead` read from one response. */
export interface SignedAttempt {
  status: number;
  /** The `code` of the response body, when it has one. */
  code?: string;
  /** A `sign_required` body, parsed by the caller for `sendSignedRead`. */
  signRequired?: { request: ProposedRead } | null;
}

/**
 * A signature expired in flight, or the A2T went stale. Signing again is
 * correct once, and a second failure is the caller's error.
 */
const isRenewable = (attempt: SignedAttempt): boolean =>
  (attempt.status === 403 && attempt.code === 'venue_authorization_invalid') ||
  (attempt.status === 409 && attempt.code === 'venue_signature_expired');

/**
 * Renders and signs `operation`, then sends the call. There is one round
 * trip: the signed call is the first call. A response that says the
 * signature or the A2T is stale is signed again and sent once more.
 *
 * `send` performs the HTTP call with the signed operation and returns the
 * response, and `readAttempt` reads its status and code. The caller keeps
 * the response.
 */
export const sendSigned = async <Response>(
  deps: SignedVenueCallDependencies,
  intent: VenueIntentName,
  input: SignOperationInput | undefined,
  send: (signed: SignedOperation) => Promise<Response>,
  readAttempt: (response: Response) => Promise<SignedAttempt> | SignedAttempt,
): Promise<Response> => {
  let requestSent = false;

  const sign = async (
    signInput: SignOperationInput | undefined,
  ): Promise<SignedOperation> => {
    let signed: SignedOperation | undefined;
    try {
      signed = await deps.signOperation(intent, signInput);
    } catch (error) {
      if (error instanceof TemplateError) {
        Logger.log('PredictNext: venue signing refused', error.rule);
        throw new VenueSigningRefusedError(error.rule, requestSent);
      }
      throw error;
    }
    if (!signed) {
      throw new VenueSigningUnavailableError(requestSent);
    }
    return signed;
  };

  // The first signature already pinned a confirmed intent. Signing it again
  // is not a new confirmation by the user.
  const renewed = input && { ...input, confirmed: false };

  const attempt = async (retried: boolean): Promise<Response> => {
    const signed = await sign(retried ? renewed : input);
    requestSent = true;
    const response = await send(signed);
    if (retried) {
      return response;
    }
    const described = await readAttempt(response);
    if (!isRenewable(described)) {
      return response;
    }
    if (described.code === 'venue_authorization_invalid') {
      deps.invalidateSigningSession();
    }
    return attempt(true);
  };

  return attempt(false);
};

/**
 * Two-phase signed read (ADR-0004): `send()` first goes out bearer-only and
 * answers with a `sign_required` proposal of the one venue GET the route
 * needs. The phone signs that GET and re-calls the SAME route with the
 * envelope and the signed GET's coordinates. Reconciliation proposals may
 * bind a server challenge to persisted scan progress.
 *
 * Each attempt permits two signed calls. One explicit signature/A2T
 * failure may renew the whole attempt once. A further proposal defers the
 * read without discarding server-owned scan progress. Anything the proposal
 * flow does not describe — an error status, an unexpected body — is
 * returned as-is so the caller treats it like an ordinary response.
 */
const MAX_READ_SIGNATURES = 2;

export const sendSignedRead = async <Response>(
  deps: SignedReadDependencies,
  send: (
    deviceAuth?: DeviceAuthHeader,
    signed?: ProposedRead,
  ) => Promise<Response>,
  readAttempt: (response: Response) => Promise<SignedAttempt> | SignedAttempt,
): Promise<Response> => {
  let requestSent = false;

  const sign = async (proposed: ProposedRead): Promise<DeviceAuthHeader> => {
    let header: DeviceAuthHeader | undefined;
    try {
      header = await deps.signRead(proposed);
    } catch (error) {
      if (error instanceof TemplateError) {
        Logger.log('PredictNext: venue read signing refused', error.rule);
        throw new VenueSigningRefusedError(error.rule, requestSent);
      }
      throw error;
    }
    if (!header) {
      throw new VenueSigningUnavailableError(requestSent);
    }
    return header;
  };

  /** The response's `sign_required` proposal, when it names one. */
  const describedProposal = async (
    response: Response,
  ): Promise<ProposedRead | undefined> => {
    const { signRequired } = await readAttempt(response);
    const request = signRequired?.request;
    if (
      !request ||
      typeof request.method !== 'string' ||
      typeof request.path !== 'string' ||
      typeof request.query !== 'string'
    ) {
      return undefined;
    }
    return request;
  };

  const attempt = async (retried: boolean): Promise<Response> => {
    // Phase one: bearer-only. No header, no signature.
    requestSent = true;
    const first = await send();
    let proposed = await describedProposal(first);
    if (proposed === undefined) {
      return first;
    }
    for (
      let signatures = 0;
      signatures < MAX_READ_SIGNATURES;
      signatures += 1
    ) {
      const response = await send(await sign(proposed), proposed);
      const next = await describedProposal(response);
      if (next === undefined) {
        if (retried) {
          return response;
        }
        const described = await readAttempt(response);
        if (!isRenewable(described)) {
          return response;
        }
        if (described.code === 'venue_authorization_invalid') {
          deps.invalidateSigningSession();
        }
        return attempt(true);
      }
      proposed = next;
    }
    Logger.log(
      'PredictNext: the route kept proposing a different venue read',
      MAX_READ_SIGNATURES,
    );
    throw new VenueReadBudgetExhaustedError();
  };

  return attempt(false);
};
