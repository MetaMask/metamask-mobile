/**
 * Wave 1 classified contract for seedless password-change faults.
 *
 * Each profile names one hop, the checkpoint left after that hop fails, and
 * the PasswordSyncInstruction unlock must resolve. Controller package enums
 * are the long-term owner; Mobile ships the first Mockttp + coordinator demo.
 *
 * `metadata_set_fails_after_sss_ok` is REMOTE_PASSWORD_PENDING: the metadata
 * write lives inside changeEncKey, before LOCAL_STATE_PENDING is saved.
 */

import {
  PasswordSyncInstruction,
  SeedlessOnboardingCheckpoint,
} from '@metamask/seedless-onboarding-controller';

export const SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE = {
  SssStoreFails: 'sss_store_fails',
  MetadataSetFailsAfterSssOk: 'metadata_set_fails_after_sss_ok',
  ChangeEncKeyTimesOut: 'change_enc_key_times_out',
  SeedlessVaultRewriteFails: 'seedless_vault_rewrite_fails',
  KeyringChangeFails: 'keyring_change_fails',
  KeySyncStoreFails: 'key_sync_store_fails',
} as const;

export type SeedlessPasswordChangeFaultProfile =
  (typeof SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE)[keyof typeof SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE];

export type SeedlessPasswordChangeFaultInjection = 'http' | 'controller';

export type SeedlessPasswordChangeFaultHop =
  | 'sss'
  | 'metadata'
  | 'changeEncKey'
  | 'seedless-vault'
  | 'keyring'
  | 'key-sync';

export interface SeedlessPasswordChangeFaultSpec {
  id: SeedlessPasswordChangeFaultProfile;
  injection: SeedlessPasswordChangeFaultInjection;
  hop: SeedlessPasswordChangeFaultHop;
  checkpoint: SeedlessOnboardingCheckpoint;
  remoteCommitted: boolean;
  instruction: PasswordSyncInstruction;
}

export const SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS: Record<
  SeedlessPasswordChangeFaultProfile,
  SeedlessPasswordChangeFaultSpec
> = {
  [SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SssStoreFails]: {
    id: SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SssStoreFails,
    injection: 'http',
    hop: 'sss',
    checkpoint: SeedlessOnboardingCheckpoint.RemotePasswordPending,
    remoteCommitted: false,
    instruction: PasswordSyncInstruction.InSync,
  },
  [SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk]: {
    id: SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk,
    injection: 'http',
    hop: 'metadata',
    checkpoint: SeedlessOnboardingCheckpoint.RemotePasswordPending,
    remoteCommitted: true,
    instruction: PasswordSyncInstruction.PasswordOutdated,
  },
  [SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.ChangeEncKeyTimesOut]: {
    id: SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.ChangeEncKeyTimesOut,
    injection: 'http',
    hop: 'changeEncKey',
    checkpoint: SeedlessOnboardingCheckpoint.RemotePasswordPending,
    remoteCommitted: true,
    instruction: PasswordSyncInstruction.PasswordOutdated,
  },
  [SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SeedlessVaultRewriteFails]: {
    id: SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.SeedlessVaultRewriteFails,
    injection: 'controller',
    hop: 'seedless-vault',
    checkpoint: SeedlessOnboardingCheckpoint.LocalStatePending,
    remoteCommitted: true,
    instruction: PasswordSyncInstruction.PasswordOutdated,
  },
  [SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.KeyringChangeFails]: {
    id: SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.KeyringChangeFails,
    injection: 'controller',
    hop: 'keyring',
    checkpoint: SeedlessOnboardingCheckpoint.LocalPasswordPending,
    remoteCommitted: true,
    instruction: PasswordSyncInstruction.ReconcileKeyring,
  },
  [SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.KeySyncStoreFails]: {
    id: SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.KeySyncStoreFails,
    injection: 'controller',
    hop: 'key-sync',
    checkpoint: SeedlessOnboardingCheckpoint.KeySyncPending,
    remoteCommitted: true,
    instruction: PasswordSyncInstruction.SyncKey,
  },
};

export const SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_IDS = Object.values(
  SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE,
);

export const isHttpSeedlessPasswordChangeFault = (
  profile: SeedlessPasswordChangeFaultProfile,
): boolean =>
  SEEDLESS_PASSWORD_CHANGE_FAULT_SPECS[profile].injection === 'http';
