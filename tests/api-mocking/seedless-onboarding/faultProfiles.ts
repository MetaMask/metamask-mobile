/**
 * Named seedless password-change fault profiles.
 *
 * Expected phases match ADR 0002 / 0003. The controller package is the long-term
 * owner of these names; Mobile ships the first Mockttp implementation.
 */

export const SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE = {
  MetadataSetFailsAfterSssOk: 'metadata_set_fails_after_sss_ok',
} as const;

export type SeedlessPasswordChangeFaultProfile =
  (typeof SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE)[keyof typeof SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE];

export const SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_PHASE: Record<
  SeedlessPasswordChangeFaultProfile,
  'LOCAL_STATE_PENDING'
> = {
  [SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk]:
    'LOCAL_STATE_PENDING',
};
