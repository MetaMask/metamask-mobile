import type {
  PerpsPendingManualRecovery,
  PerpsRecoveredDispatch,
} from '@metamask/perps-controller';

export const PerpsRecoveryPanelTestIds = {
  PANEL: 'perps-recovery-panel',
  LOADING: 'perps-recovery-loading',
  UNAVAILABLE: 'perps-recovery-unavailable',
  ERROR: 'perps-recovery-error',
  ACTION_ERROR: 'perps-recovery-action-error',
  CHECK_STATUS: 'perps-recovery-check-status',
  RETRY: 'perps-recovery-retry',
  DISPATCH: 'perps-recovery-dispatch',
  PROTECTION: 'perps-recovery-protection',
  REVIEW: 'perps-recovery-review',
  VENUE: 'perps-recovery-venue',
  POSITION: 'perps-recovery-position',
  ORDER: 'perps-recovery-order',
  ACKNOWLEDGE: 'perps-recovery-acknowledge',
  EDIT_PROTECTION: 'perps-recovery-edit-protection',
  REMOVE_PROTECTION: 'perps-recovery-remove-protection',
  REMOVAL_WARNING: 'perps-recovery-removal-warning',
  CONFIRM_REMOVAL: 'perps-recovery-confirm-removal',
  CANCEL_REMOVAL: 'perps-recovery-cancel-removal',
} as const;

/**
 * Identify one entry's UI action without parsing or displaying its opaque source.
 * The entry kind distinguishes dispatch and protection identifiers. Historical
 * protection entries retain their existing settlement identity.
 *
 * @param actionId - The recovery action's test ID prefix.
 * @param entry - The exact recovery entry owned by the action.
 * @returns An identifier for automation, separate from accessible user text.
 */
export const getPerpsRecoveryEntryTestId = (
  actionId: (typeof PerpsRecoveryPanelTestIds)[keyof typeof PerpsRecoveryPanelTestIds],
  entry: PerpsRecoveredDispatch | PerpsPendingManualRecovery,
): string => {
  const identity =
    'settlementKey' in entry
      ? ['protection', entry.recoveryId ?? entry.settlementKey]
      : ['dispatch', entry.recoveryId];
  return `${actionId}:${JSON.stringify(identity)}`;
};
