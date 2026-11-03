import Logger from '../../../../../util/Logger';
import {
  TemplateError,
  type TemplateRule,
} from '../../auth/signing/venueTemplates';
import type {
  DeviceAuthHeader,
  SignOperationInput,
} from '../../auth/signing/signOperationTypes';
import type { VenueOperationName } from '../../auth/venueSigningProfiles';

/** Signs one canonical operation. Provided by the Engine. */
export type SignOperation = (
  operation: VenueOperationName,
  input?: SignOperationInput,
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

/** What `sendSigned` needs to know about one response. */
export interface SignedAttempt {
  status: number;
  /** The `code` of the response body, when it has one. */
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
 * Renders and signs `operation`, then sends the call. There is one round
 * trip: the signed call is the first call. A response that says the
 * signature or the A2T is stale is signed again and sent once more.
 *
 * `send` performs the HTTP call with the header and returns the response, and
 * `describe` reads its status and code. The caller keeps the response.
 */
export const sendSigned = async <Response>(
  deps: SignedVenueCallDependencies,
  operation: VenueOperationName,
  input: SignOperationInput | undefined,
  send: (header: DeviceAuthHeader) => Promise<Response>,
  describe: (response: Response) => Promise<SignedAttempt> | SignedAttempt,
): Promise<Response> => {
  const sign = async (): Promise<DeviceAuthHeader> => {
    let header: DeviceAuthHeader | undefined;
    try {
      header = await deps.signOperation(operation, input);
    } catch (error) {
      if (error instanceof TemplateError) {
        Logger.log('PredictNext: venue signing refused', error.rule);
        throw new VenueSigningRefusedError(error.rule);
      }
      throw error;
    }
    if (!header) {
      throw new VenueSigningUnavailableError();
    }
    return header;
  };

  const attempt = async (retried: boolean): Promise<Response> => {
    const response = await send(await sign());
    if (retried) {
      return response;
    }
    const described = await describe(response);
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
