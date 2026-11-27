/**
 * Wave 2 kill-after contract for seedless password change.
 *
 * Appium cannot time a process kill against TOPRF. The app arms one hop,
 * persists that hop, then halts so the runner can terminate after persist
 * and before the next hop.
 *
 * Remote HTTP hops stay Wave 1. These kills cover the Mobile-owned spine
 * after `SeedlessOnboardingController.changePassword` returns.
 */

import { PasswordSyncInstruction } from '@metamask/seedless-onboarding-controller';
import {
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  type SeedlessPasswordChangeKillAfter,
} from '../../../app/core/Authentication/seedlessPasswordChangeKillSwitch.constants';

export {
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER_IDS,
  SEEDLESS_PASSWORD_CHANGE_KILL_READY_TEST_ID,
  isSeedlessPasswordChangeKillAfter,
} from '../../../app/core/Authentication/seedlessPasswordChangeKillSwitch.constants';
export type { SeedlessPasswordChangeKillAfter } from '../../../app/core/Authentication/seedlessPasswordChangeKillSwitch.constants';

export interface SeedlessPasswordChangeKillSpec {
  id: SeedlessPasswordChangeKillAfter;
  /**
   * Unlock instruction after a cold start that killed at this hop.
   * Core `changePassword` ends on LOCAL_PASSWORD_PENDING, so the first two
   * kills resolve ReconcileKeyring. KEY_SYNC_PENDING resolves SyncKey.
   */
  instruction: PasswordSyncInstruction;
}

export const SEEDLESS_PASSWORD_CHANGE_KILL_SPECS: Record<
  SeedlessPasswordChangeKillAfter,
  SeedlessPasswordChangeKillSpec
> = {
  [SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.SeedlessChangePassword]: {
    id: SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.SeedlessChangePassword,
    instruction: PasswordSyncInstruction.ReconcileKeyring,
  },
  [SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange]: {
    id: SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange,
    instruction: PasswordSyncInstruction.ReconcileKeyring,
  },
  [SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending]: {
    id: SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
    instruction: PasswordSyncInstruction.SyncKey,
  },
};
