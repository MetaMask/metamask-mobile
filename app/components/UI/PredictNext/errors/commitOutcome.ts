import { PredictError } from './PredictError';

export type PredictErrorPhase =
  | 'preview'
  | 'commit'
  | 'observe'
  | 'signed_read';

/**
 * What a failed commit call did, as the API states it in the error body's
 * `outcome` field. `not_placed` is the API's guarantee that this call
 * changed nothing: no order, deposit or withdrawal was created or sent to
 * the venue. Anything else is `unknown`: a missing field, another value, a
 * body that is not JSON, a gateway error or no response at all.
 */
export type PredictCommitOutcome = 'not_placed' | 'unknown';

/** Reads the `outcome` of an error body. Only the exact guarantee counts. */
export const commitOutcomeFromBody = (body: unknown): PredictCommitOutcome => {
  if (
    typeof body === 'object' &&
    body !== null &&
    (body as { outcome?: unknown }).outcome === 'not_placed'
  ) {
    return 'not_placed';
  }
  return 'unknown';
};

/**
 * Whether a commit failure proves this call changed nothing, so its
 * operation may be forgotten. Two facts prove it: the request never left the
 * phone (`requestSent: false`, known locally), or the API said `not_placed`.
 * Everything else is unknown, and an unknown operation is kept and
 * reconciled. This speaks for this call only, never for an earlier or
 * concurrent submission, and never for an observation.
 */
export const isUnsentCommitFailure = (
  error: unknown,
): error is PredictError => {
  if (!(error instanceof PredictError) || error.metadata?.phase !== 'commit') {
    return false;
  }
  if (error.metadata.requestSent === false) {
    return true;
  }
  switch (error.metadata.outcome) {
    case 'not_placed':
      return true;
    default:
      // No guarantee: the call may have reached the venue. Keep it.
      return false;
  }
};
