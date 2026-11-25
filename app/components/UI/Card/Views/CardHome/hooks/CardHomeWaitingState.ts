import type { CardAlert } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import type { CardProvisioningView } from '../../../types';

/** Alert types that describe a card still being set up. */
export const SETUP_ALERT_TYPES = new Set([
  'kyc_pending',
  'card_provisioning',
  'allowance_revoked',
]);

/**
 * What the Card home "Setting up your card" view is waiting on. One derived
 * value drives the whole view instead of scattered booleans:
 *
 * - `signed-out-kyc-pending` — A09: still in onboarding with no Card session.
 * - `identity-review` — A07: identity (KYC) in review, e.g. Baanx kyc_pending.
 * - `creating-card` — A08: the card is being created / provisioned.
 * - `immersve-review` — Immersve reconciliation resolved to "under review".
 * - `immersve-reconciling` — the Immersve reconcile check is in flight; this
 * stays on the waiting view so the half-built home never flashes.
 */
export type CardHomeWaitingStep =
  | 'signed-out-kyc-pending'
  | 'identity-review'
  | 'creating-card'
  | 'immersve-review'
  | 'immersve-reconciling';

export type CardHomeWaitingState =
  | { kind: 'not-waiting' }
  | { kind: 'waiting'; step: CardHomeWaitingStep };

export interface CardHomeWaitingInput {
  isLoading: boolean;
  isUkMigrationForced: boolean;
  isAuthenticated: boolean;
  isSignedOutKycPending: boolean;
  /** True when the dashboard has any provider action to show (e.g. A06). */
  hasDashboardActions: boolean;
  alerts: Pick<CardAlert, 'type'>[];
  provisioningView: CardProvisioningView;
}

const waiting = (step: CardHomeWaitingStep): CardHomeWaitingState => ({
  kind: 'waiting',
  step,
});
const NOT_WAITING: CardHomeWaitingState = { kind: 'not-waiting' };

/**
 * Resolves which waiting state, if any, Card home is in. Every "ready"
 * layout (segments, Add funds, management list) only renders when this
 * returns `not-waiting`, so a re-check that is still in flight, failed, or
 * not yet resolved can never fall through to a ready-looking home.
 */
export const resolveCardHomeWaitingState = ({
  isLoading,
  isUkMigrationForced,
  isAuthenticated,
  isSignedOutKycPending,
  hasDashboardActions,
  alerts,
  provisioningView,
}: CardHomeWaitingInput): CardHomeWaitingState => {
  if (isUkMigrationForced) {
    return NOT_WAITING;
  }
  // A09: a signed-out user still in onboarding has no Card session yet, so
  // the home cannot be ready — even before card home data arrives, and even
  // after verification reads VERIFIED (they still have to sign in).
  if (isSignedOutKycPending) {
    return waiting('signed-out-kyc-pending');
  }
  if (isLoading || !isAuthenticated) {
    return NOT_WAITING;
  }
  // An actionable step (A06, Enable card) owns the screen, including while
  // its re-check runs: the layout stays put and the button waits disabled.
  if (hasDashboardActions) {
    return NOT_WAITING;
  }
  if (alerts.some((cardAlert) => cardAlert.type === 'kyc_pending')) {
    return waiting('identity-review');
  }
  if (!alerts.some((cardAlert) => cardAlert.type === 'card_provisioning')) {
    return NOT_WAITING;
  }
  switch (provisioningView) {
    // A reconciliation check with nothing to manage yet owns the screen
    // until it resolves, so the half-built home never flashes mid-check.
    case 'reconciling':
      return waiting('immersve-reconciling');
    case 'kyc_under_review':
      return waiting('immersve-review');
    case 'provisioning':
      return waiting('creating-card');
    default:
      return NOT_WAITING;
  }
};
