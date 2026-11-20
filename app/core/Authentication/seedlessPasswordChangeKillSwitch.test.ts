import { PasswordSyncInstruction } from '@metamask/seedless-onboarding-controller';

import {
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  applySeedlessPasswordChangeKillDeepLink,
  getSeedlessPasswordChangeKillAfter,
  haltIfSeedlessPasswordChangeKillAfter,
  resetSeedlessPasswordChangeKillSwitchForTests,
  setSeedlessPasswordChangeKillAfter,
  subscribeSeedlessPasswordChangeKillReady,
} from './seedlessPasswordChangeKillSwitch';
import { SEEDLESS_PASSWORD_CHANGE_KILL_SPECS } from '../../../tests/api-mocking/seedless-onboarding/killProfiles';

describe('seedlessPasswordChangeKillSwitch', () => {
  beforeEach(() => {
    resetSeedlessPasswordChangeKillSwitchForTests();
  });

  it('arms a hop from the e2e kill-after deep link', () => {
    applySeedlessPasswordChangeKillDeepLink(
      'metamask://e2e/seedless-password-change/kill-after?hop=after_key_sync_pending',
    );

    expect(getSeedlessPasswordChangeKillAfter()).toBe(
      SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
    );
  });

  it('ignores an unknown hop in the deep link', () => {
    applySeedlessPasswordChangeKillDeepLink(
      'metamask://e2e/seedless-password-change/kill-after?hop=after_remote',
    );

    expect(getSeedlessPasswordChangeKillAfter()).toBeUndefined();
  });

  it('throws a halt in Jest after the armed hop and notifies listeners', async () => {
    const readyHops: string[] = [];
    const unsubscribe = subscribeSeedlessPasswordChangeKillReady((hop) => {
      readyHops.push(hop);
    });
    setSeedlessPasswordChangeKillAfter(
      SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange,
    );

    await expect(
      haltIfSeedlessPasswordChangeKillAfter(
        SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange,
      ),
    ).rejects.toThrow(/SEEDLESS_E2E_KILL_HALT:after_keyring_change/);

    expect(readyHops).toEqual([
      SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange,
    ]);
    unsubscribe();
  });

  it('returns when a different hop is armed', async () => {
    setSeedlessPasswordChangeKillAfter(
      SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
    );

    await expect(
      haltIfSeedlessPasswordChangeKillAfter(
        SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange,
      ),
    ).resolves.toBeUndefined();
  });
});

describe('seedless password-change kill profiles', () => {
  it('maps each Wave 2 hop to an unlock instruction', () => {
    expect(
      SEEDLESS_PASSWORD_CHANGE_KILL_SPECS[
        SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.SeedlessChangePassword
      ].instruction,
    ).toBe(PasswordSyncInstruction.ReconcileKeyring);
    expect(
      SEEDLESS_PASSWORD_CHANGE_KILL_SPECS[
        SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange
      ].instruction,
    ).toBe(PasswordSyncInstruction.ReconcileKeyring);
    expect(
      SEEDLESS_PASSWORD_CHANGE_KILL_SPECS[
        SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending
      ].instruction,
    ).toBe(PasswordSyncInstruction.SyncKey);
  });
});
