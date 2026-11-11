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
}

/**
 * Signs one server-proposed read after the caller's L1 allowlist check.
 * Provided by the Engine. Throws `TemplateError` when the proposal is not
 * allowed; undefined means signing is unavailable.
 */
export type SignRead = (
  proposed: ProposedRead,
) => Promise<DeviceAuthHeader | undefined>;

/** The phone's profile did not allow the request. Nothing was signed. */
export class VenueSigningRefusedError extends Error {
  readonly rule: TemplateRule;

  constructor(rule: TemplateRule) {
    super(`Venue request was not signed: ${rule}.`);
    this.name = 'VenueSigningRefusedError';
    this.rule = rule;
  }
}

/** Signing is not available: disabled, locked, signed out, or no A2T. */
export class VenueSigningUnavailableError extends Error {
  constructor() {
    super('Venue request signing is unavailable.');
    this.name = 'VenueSigningUnavailableError';
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
  signRequired?: {
    request: ProposedRead;
    proposal: string;
  } | null;
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
  const sign = async (
    signInput: SignOperationInput | undefined,
  ): Promise<SignedOperation> => {
    let signed: SignedOperation | undefined;
    try {
      signed = await deps.signOperation(intent, signInput);
    } catch (error) {
      if (error instanceof TemplateError) {
        Logger.log('PredictNext: venue signing refused', error.rule);
        throw new VenueSigningRefusedError(error.rule);
      }
      throw error;
    }
    if (!signed) {
      throw new VenueSigningUnavailableError();
    }
    return signed;
  };

  // The first signature already pinned a confirmed intent. Signing it again
  // is not a new confirmation by the user.
  const renewed = input && { ...input, confirmed: false };

  const attempt = async (retried: boolean): Promise<Response> => {
    const response = await send(await sign(retried ? renewed : input));
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
 * answers with a `sign_required` proposal, which the phone L1-checks and
 * signs, then re-calls the SAME route URL with the envelope and the
 * proposal token. A route whose DTO needs several upstream reads chains
 * them: every fulfilled relayed read answers with the NEXT `sign_required`
 * proposal, and the phone signs again — each proposal is L1-checked, so a
 * proposal outside the profile's allowlist is refused, and the chain is
 * bounded at `MAX_READ_PROPOSALS`. A response that says the signature or
 * the A2T is stale is proposed and signed again (without a fresh
 * confirmation) once; a second failure is the caller's error. Anything the
 * proposal flow does not describe — an error status, an unexpected body —
 * is returned as-is so the caller treats it like an ordinary response.
 */
const MAX_READ_PROPOSALS = 10;

export const sendSignedRead = async <Response>(
  deps: SignedReadDependencies,
  send: (deviceAuth?: DeviceAuthHeader, proposal?: string) => Promise<Response>,
  readAttempt: (response: Response) => Promise<SignedAttempt> | SignedAttempt,
): Promise<Response> => {
  const sign = async (proposed: ProposedRead): Promise<DeviceAuthHeader> => {
    let header: DeviceAuthHeader | undefined;
    try {
      header = await deps.signRead(proposed);
    } catch (error) {
      if (error instanceof TemplateError) {
        Logger.log('PredictNext: venue read signing refused', error.rule);
        throw new VenueSigningRefusedError(error.rule);
      }
      throw error;
    }
    if (!header) {
      throw new VenueSigningUnavailableError();
    }
    return header;
  };

  /** Reads one response's `sign_required` proposal, when it names one the
   * phone can act on. */
  const describedProposal = async (
    response: Response,
  ): Promise<{ request: ProposedRead; proposal: string } | undefined> => {
    const described = await readAttempt(response);
    const signRequired = described.signRequired;
    if (typeof signRequired !== 'object' || signRequired === null) {
      return undefined;
    }
    const request = signRequired.request;
    const proposal = signRequired.proposal;
    if (
      !request ||
      typeof request !== 'object' ||
      typeof request.method !== 'string' ||
      typeof request.path !== 'string' ||
      typeof request.query !== 'string' ||
      typeof proposal !== 'string' ||
      proposal.length === 0
    ) {
      return undefined;
    }
    return { request, proposal };
  };

  const attempt = async (retried: boolean): Promise<Response> => {
    // Phase one: the proposal GET. No header, no signature.
    const proposed = await send();
    const first = await describedProposal(proposed);
    if (first === undefined) {
      return proposed;
    }
    // Phase two: sign each proposed upstream read and re-call. A fulfilled
    // read may itself answer with the next `sign_required` proposal of the
    // route's relay plan.
    let signed = first;
    for (let hop = 0; hop < MAX_READ_PROPOSALS; hop += 1) {
      const response = await send(await sign(signed.request), signed.proposal);
      const next = await describedProposal(response);
      if (next === undefined) {
        if (retried) {
          return response;
        }
        const retry = await readAttempt(response);
        if (!isRenewable(retry)) {
          return response;
        }
        if (retry.code === 'venue_authorization_invalid') {
          deps.invalidateSigningSession();
        }
        return attempt(true);
      }
      signed = next;
    }
    Logger.log(
      'PredictNext: venue read relay exceeded its proposal bound',
      MAX_READ_PROPOSALS,
    );
    throw new VenueSigningUnavailableError();
  };

  return attempt(false);
};
