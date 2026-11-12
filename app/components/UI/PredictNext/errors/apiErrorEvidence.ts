export type PredictErrorPhase = 'preview' | 'commit' | 'observe' | 'signed_read';
export type PredictMutationRelay =
  | 'not_a_mutation'
  | 'not_relayed_this_invocation'
  | 'unknown';

export interface PredictErrorEvidence {
  phase: PredictErrorPhase;
  mutationRelay: PredictMutationRelay;
  /** Errors never resolve a prior/concurrent submission. Only a receipt does. */
  operationOutcome: 'unknown';
}

const COMMIT_PRE_RELAY_CODES: Record<string, true | undefined> = {
  preview_not_found: true,
  preview_expired: true,
  market_not_found: true,
  market_not_tradeable: true,
  balance_unavailable: true,
  position_unavailable: true,
  insufficient_balance: true,
  insufficient_position: true,
  venue_unavailable: true,
  venue_preview_mismatch: true,
  venue_authorization_malformed: true,
  venue_authorization_required: true,
  venue_authorization_invalid: true,
  venue_signature_expired: true,
  venue_step_changed: true,
  venue_profile_update_required: true,
  venue_profile_not_ready: true,
};
/** Not a retry policy: this invocation's relay evidence says nothing about an
 * earlier/concurrent commit for the same preview. Never apply commit evidence
 * to an observation failure, including an observation 404. */
export function predictErrorEvidence(
  phase: PredictErrorPhase,
  bodyCode?: string,
  requestSent?: boolean,
): PredictErrorEvidence {
  return {
    phase,
    mutationRelay:
      phase !== 'commit'
        ? 'not_a_mutation'
        : requestSent === false ||
            (bodyCode !== undefined && COMMIT_PRE_RELAY_CODES[bodyCode] === true)
          ? 'not_relayed_this_invocation'
          : 'unknown',
    operationOutcome: 'unknown',
  };
}
