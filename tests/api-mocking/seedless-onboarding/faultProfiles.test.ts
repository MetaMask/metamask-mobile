import {
  PasswordSyncInstruction,
  SeedlessOnboardingCheckpoint,
} from '@metamask/seedless-onboarding-controller';

import {
  isHttpSeedlessPasswordChangeFault,
  SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE,
  SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_IDS,
  SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS,
} from './faultProfiles';

describe('seedless password-change fault profiles', () => {
  it('covers every Wave 1 hop with a unique spec id', () => {
    const hops = Object.values(SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS).map(
      (spec) => spec.hop,
    );

    expect(SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_IDS).toHaveLength(6);
    expect(new Set(hops).size).toBe(6);
    SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_IDS.forEach((id) => {
      expect(SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS[id].id).toBe(id);
    });
  });

  it('maps metadata_set_fails_after_sss_ok to REMOTE_PASSWORD_PENDING', () => {
    const spec =
      SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS[
        SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk
      ];

    expect(spec.checkpoint).toBe(
      SeedlessOnboardingCheckpoint.RemotePasswordPending,
    );
    expect(spec.instruction).toBe(PasswordSyncInstruction.PasswordOutdated);
    expect(spec.remoteCommitted).toBe(true);
  });

  it('clears recovery when SSS fails before remote commit', () => {
    const spec =
      SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS[
        SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SssStoreFails
      ];

    expect(spec.checkpoint).toBe(
      SeedlessOnboardingCheckpoint.RemotePasswordPending,
    );
    expect(spec.remoteCommitted).toBe(false);
    expect(spec.instruction).toBe(PasswordSyncInstruction.InSync);
  });

  it('assigns every single-device PasswordSyncInstruction to at least one profile', () => {
    const instructions = new Set(
      Object.values(SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS).map(
        (spec) => spec.instruction,
      ),
    );
    // WalletResetRequired also needs a password change on another device.
    const singleDeviceInstructions = Object.values(
      PasswordSyncInstruction,
    ).filter(
      (instruction) =>
        instruction !== PasswordSyncInstruction.WalletResetRequired,
    );

    expect(instructions).toEqual(new Set(singleDeviceInstructions));
  });

  it('marks only remote hops as HTTP injection', () => {
    const httpProfiles = SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_IDS.filter(
      isHttpSeedlessPasswordChangeFault,
    );

    expect(httpProfiles).toEqual([
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SssStoreFails,
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk,
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.ChangeEncKeyTimesOut,
    ]);
  });

  it('maps local hops to the 0003 unlock instructions', () => {
    expect(
      SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS[
        SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SeedlessVaultRewriteFails
      ],
    ).toMatchObject({
      checkpoint: SeedlessOnboardingCheckpoint.LocalStatePending,
      instruction: PasswordSyncInstruction.PasswordOutdated,
    });
    expect(
      SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS[
        SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.KeyringChangeFails
      ],
    ).toMatchObject({
      checkpoint: SeedlessOnboardingCheckpoint.LocalPasswordPending,
      instruction: PasswordSyncInstruction.ReconcileKeyring,
    });
    expect(
      SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS[
        SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.KeySyncStoreFails
      ],
    ).toMatchObject({
      checkpoint: SeedlessOnboardingCheckpoint.KeySyncPending,
      instruction: PasswordSyncInstruction.SyncKey,
    });
  });
});
