import type { MfaRecoveryController } from '@metamask/mfa-recovery-controller';
import { clearPendingOperationForDev } from './clearPendingOperation';

describe('clearPendingOperationForDev', () => {
  it('sets the persisted pending operation to null', () => {
    const state = { pendingOperation: 'encrypted-operation' as string | null };
    const controller = {
      update: (callback: (draft: typeof state) => void) => callback(state),
    } as unknown as MfaRecoveryController;

    clearPendingOperationForDev(controller);

    expect(state.pendingOperation).toBeNull();
  });
});
