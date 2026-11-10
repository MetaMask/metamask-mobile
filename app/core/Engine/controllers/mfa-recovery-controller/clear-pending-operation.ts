import type { MfaRecoveryController } from '@metamask/mfa-recovery-controller';

/**
 * Developer-only helper that drops any persisted pending mutation from the
 * MFA recovery controller state, so the developer options can recover from a
 * stuck operation.
 *
 * `update` is protected on `BaseController`, so it is reached through a narrow
 * cast. Do not use this outside developer tooling.
 */
export function clearPendingOperationForDev(
  controller: MfaRecoveryController,
): void {
  const updatable = controller as unknown as {
    update: (
      callback: (state: { pendingOperation: string | null }) => void,
    ) => void;
  };
  updatable.update((state) => {
    state.pendingOperation = null;
  });
}
