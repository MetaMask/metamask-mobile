/**
 * Kill-hop names shared by the app and the Appium harness.
 *
 * This module stays free of imports so the Appium runner, which loads it
 * from plain Node, can read the names without pulling in React Native.
 */

export const SEEDLESS_PASSWORD_CHANGE_KILL_AFTER = {
  SeedlessChangePassword: 'after_seedless_change_password',
  KeyringChange: 'after_keyring_change',
  KeySyncPending: 'after_key_sync_pending',
} as const;

export type SeedlessPasswordChangeKillAfter =
  (typeof SEEDLESS_PASSWORD_CHANGE_KILL_AFTER)[keyof typeof SEEDLESS_PASSWORD_CHANGE_KILL_AFTER];

export const SEEDLESS_PASSWORD_CHANGE_KILL_AFTER_IDS = Object.values(
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
);

export const isSeedlessPasswordChangeKillAfter = (
  value: string,
): value is SeedlessPasswordChangeKillAfter =>
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER_IDS.includes(
    value as SeedlessPasswordChangeKillAfter,
  );

export const SEEDLESS_PASSWORD_CHANGE_KILL_READY_TEST_ID =
  'seedless-password-change-kill-ready';

export const E2E_SEEDLESS_KILL_METAMASK_SCHEME =
  'metamask://e2e/seedless-password-change/';

export const E2E_SEEDLESS_KILL_RAW_SCHEME = 'e2e://seedless-password-change/';
