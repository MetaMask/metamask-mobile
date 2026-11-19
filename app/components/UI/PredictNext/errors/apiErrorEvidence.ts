export type PredictErrorPhase =
  | 'preview'
  | 'commit'
  | 'observe'
  | 'signed_read';
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
  venue_preview_mismatch: true,
  client_order_id_conflict: true,
  client_operation_id_conflict: true,
  deposit_in_progress: true,
  deposit_not_cancellable: true,
  venue_authorization_malformed: true,
  venue_authorization_required: true,
  venue_authorization_invalid: true,
  venue_signature_expired: true,
  venue_step_changed: true,
  venue_profile_update_required: true,
  venue_profile_not_ready: true,
};
/** Codes one route refuses before it stores or relays anything, on top of
 * the codes every commit route refuses that way. A code goes here when it
 * means that on this route only. */
export type PredictRouteRefusals = Readonly<Record<string, true | undefined>>;

export interface PredictEvidenceRoute {
  /** Codes this route refuses before it stores or relays anything. */
  refusesBeforeRelay?: PredictRouteRefusals;
  /** Set when this route's read replays a stored submission before it
   * answers. A failure there proves nothing about this invocation. */
  readCanReplay?: boolean;
}

/** Not a retry policy: this invocation's relay evidence says nothing about an
 * earlier/concurrent commit for the same preview. Never apply commit evidence
 * to an observation failure, including an observation 404. */
export function predictErrorEvidence(
  phase: PredictErrorPhase,
  bodyCode?: string,
  requestSent?: boolean,
  route: PredictEvidenceRoute = {},
): PredictErrorEvidence {
  const relay = (): PredictMutationRelay => {
    if (phase !== 'commit') {
      return route.readCanReplay === true && requestSent !== false
        ? 'unknown'
        : 'not_a_mutation';
    }
    if (requestSent === false) {
      return 'not_relayed_this_invocation';
    }
    return bodyCode !== undefined &&
      (COMMIT_PRE_RELAY_CODES[bodyCode] === true ||
        route.refusesBeforeRelay?.[bodyCode] === true)
      ? 'not_relayed_this_invocation'
      : 'unknown';
  };
  return {
    phase,
    mutationRelay: relay(),
    operationOutcome: 'unknown',
  };
}
