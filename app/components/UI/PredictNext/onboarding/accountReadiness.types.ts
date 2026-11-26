import type { PredictVenueId } from '../types';

export type AccountReadiness =
  | 'unknown'
  | 'setup_required'
  | 'verifying'
  | 'ready'
  | 'unavailable';

export type AccountReadinessProblem =
  | 'activation_required'
  | 'verification_failed'
  | 'cancelled'
  | 'status_unsupported'
  | 'status_inconsistent'
  | 'setup_unavailable';

export type AccountSetupIntent = 'resume' | 'restart' | 'retry';

export type AccountReadinessCard =
  | { kind: 'hidden' }
  | { kind: 'not_started' }
  | { kind: 'finish_verifying'; intent: 'resume' }
  | { kind: 'verifying' }
  | { kind: 'verified' }
  | {
      kind: 'action_required';
      reason: AccountReadinessProblem;
      intent: AccountSetupIntent;
    };

export type AccountReadinessConnection =
  | 'online'
  | 'offline'
  | 'unknown'
  | 'unavailable';

export interface AccountReadinessSnapshot {
  readiness: AccountReadiness;
  card: AccountReadinessCard;
}

export interface AccountReadinessAdapter {
  readStatus(options: {
    signal: AbortSignal;
  }): Promise<AccountReadinessSnapshot>;
  subscribe(listener: (snapshot: AccountReadinessSnapshot) => void): () => void;
  openSetup(intent: AccountSetupIntent): void;
}

export interface UseAccountReadinessOptions {
  venueId: PredictVenueId;
  isFocused: boolean;
  region: 'allowed_or_unknown' | 'blocked';
}

export interface AccountReadinessValue {
  readiness: AccountReadiness;
  card: AccountReadinessCard;
  connection: AccountReadinessConnection;
  accountActions: 'readiness_gated' | 'unchanged';
  setup: 'closed' | 'opening' | 'open';
  latency: 'unknown' | 'ok' | 'slow';
  readError: 'none' | 'unavailable';
  isRefreshing: boolean;
  refreshStatus(): void;
  startSetup(): void;
  retrySetup(): void;
  dismissVerified(): void;
}
