import {
  SETUP_ALERT_TYPES,
  resolveCardHomeWaitingState,
  type CardHomeWaitingInput,
} from './CardHomeWaitingState';

const baseInput: CardHomeWaitingInput = {
  isLoading: false,
  isUkMigrationForced: false,
  isAuthenticated: true,
  isSignedOutKycPending: false,
  hasDashboardActions: false,
  alerts: [],
  provisioningView: 'provisioning',
};

const setup = (overrides: Partial<CardHomeWaitingInput>) => ({
  ...baseInput,
  ...overrides,
});

describe('resolveCardHomeWaitingState', () => {
  it('is not waiting for a signed-in user with a ready card', () => {
    const result = resolveCardHomeWaitingState(setup({}));

    expect(result).toEqual({ kind: 'not-waiting' });
  });

  it('is not waiting while card home data is loading', () => {
    const result = resolveCardHomeWaitingState(setup({ isLoading: true }));

    expect(result).toEqual({ kind: 'not-waiting' });
  });

  it('is not waiting during a forced UK migration', () => {
    const result = resolveCardHomeWaitingState(
      setup({ isUkMigrationForced: true }),
    );

    expect(result).toEqual({ kind: 'not-waiting' });
  });

  describe('A09: signed out while still in onboarding', () => {
    it('waits before card home data has arrived', () => {
      const result = resolveCardHomeWaitingState(
        setup({
          isAuthenticated: false,
          isSignedOutKycPending: true,
          isLoading: true,
        }),
      );

      expect(result).toEqual({
        kind: 'waiting',
        step: 'signed-out-kyc-pending',
      });
    });

    it('waits even when the data would look card-ready', () => {
      const result = resolveCardHomeWaitingState(
        setup({
          isAuthenticated: false,
          isSignedOutKycPending: true,
          hasDashboardActions: true,
          alerts: [{ type: 'card_provisioning' }],
        }),
      );

      expect(result).toEqual({
        kind: 'waiting',
        step: 'signed-out-kyc-pending',
      });
    });

    it('does not wait for a signed-out user who is not pending', () => {
      const result = resolveCardHomeWaitingState(
        setup({ isAuthenticated: false }),
      );

      expect(result).toEqual({ kind: 'not-waiting' });
    });
  });

  describe('A07: identity in review', () => {
    it('waits on a kyc_pending alert with nothing actionable', () => {
      const result = resolveCardHomeWaitingState(
        setup({ alerts: [{ type: 'kyc_pending' }] }),
      );

      expect(result).toEqual({ kind: 'waiting', step: 'identity-review' });
    });
  });

  describe('A08: card being created', () => {
    it('waits on a card_provisioning alert while provisioning', () => {
      const result = resolveCardHomeWaitingState(
        setup({
          alerts: [{ type: 'card_provisioning' }],
          provisioningView: 'provisioning',
        }),
      );

      expect(result).toEqual({ kind: 'waiting', step: 'creating-card' });
    });
  });

  describe('Immersve review and reconcile checks', () => {
    it('waits while the reconcile resolves to under review', () => {
      const result = resolveCardHomeWaitingState(
        setup({
          alerts: [{ type: 'card_provisioning' }],
          provisioningView: 'kyc_under_review',
        }),
      );

      expect(result).toEqual({ kind: 'waiting', step: 'immersve-review' });
    });

    it('stays waiting while a reconcile re-check is in flight (no flash)', () => {
      // A re-check in flight with nothing actionable must never read as
      // ready: the half-built home must not flash mid-check.
      const result = resolveCardHomeWaitingState(
        setup({
          alerts: [{ type: 'card_provisioning' }],
          provisioningView: 'reconciling',
        }),
      );

      expect(result).toEqual({ kind: 'waiting', step: 'immersve-reconciling' });
    });

    it('lets an actionable step (A06) own the screen during its re-check', () => {
      const result = resolveCardHomeWaitingState(
        setup({
          alerts: [{ type: 'card_provisioning' }],
          hasDashboardActions: true,
          provisioningView: 'reconciling',
        }),
      );

      expect(result).toEqual({ kind: 'not-waiting' });
    });

    it('does not wait on a hidden provisioning view', () => {
      const result = resolveCardHomeWaitingState(
        setup({
          alerts: [{ type: 'card_provisioning' }],
          provisioningView: 'hidden',
        }),
      );

      expect(result).toEqual({ kind: 'not-waiting' });
    });

    it('does not wait on an allowance_revoked alert alone', () => {
      const result = resolveCardHomeWaitingState(
        setup({ alerts: [{ type: 'allowance_revoked' }] }),
      );

      expect(result).toEqual({ kind: 'not-waiting' });
    });

    it('prefers identity review when both alerts are present', () => {
      const result = resolveCardHomeWaitingState(
        setup({
          alerts: [{ type: 'kyc_pending' }, { type: 'card_provisioning' }],
          provisioningView: 'kyc_under_review',
        }),
      );

      expect(result).toEqual({ kind: 'waiting', step: 'identity-review' });
    });
  });

  describe('SETUP_ALERT_TYPES', () => {
    it('covers every alert type the resolver waits on', () => {
      expect(SETUP_ALERT_TYPES.has('kyc_pending')).toBe(true);
      expect(SETUP_ALERT_TYPES.has('card_provisioning')).toBe(true);
      expect(SETUP_ALERT_TYPES.has('allowance_revoked')).toBe(true);
    });
  });
});
