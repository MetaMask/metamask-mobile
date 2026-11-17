import type { SeedlessOnboardingController } from '@metamask/seedless-onboarding-controller';

/** The seedless controller methods the password steps call. */
export type MfaRecoveryPasswordSeedless = Pick<
  SeedlessOnboardingController,
  'setLocalPassword' | 'resetPasswordWithVaultKeys'
>;

export type MfaRecoveryPasswordStep =
  | 'setting_local_password'
  | 'resetting_password'
  | 'completed';

export interface MfaRecoveryPasswordResult {
  action: 'set_local' | 'reset';
}

/**
 * Creates the local vault under `password` with the vault keys recovered by
 * the full retrieval. The password is never logged or stored by this module.
 */
export async function runSetLocalPassword(
  seedless: MfaRecoveryPasswordSeedless,
  password: string,
  onStep: (step: MfaRecoveryPasswordStep) => void = () => undefined,
): Promise<MfaRecoveryPasswordResult> {
  onStep('setting_local_password');
  await seedless.setLocalPassword({ password });
  onStep('completed');
  return { action: 'set_local' };
}

/**
 * Makes `newPassword` the global password of the envelope-managed vault after
 * `setLocalPassword`, using the aal2 recovery session.
 */
export async function runResetPassword(
  seedless: MfaRecoveryPasswordSeedless,
  newPassword: string,
  onStep: (step: MfaRecoveryPasswordStep) => void = () => undefined,
): Promise<MfaRecoveryPasswordResult> {
  onStep('resetting_password');
  await seedless.resetPasswordWithVaultKeys({ newPassword });
  onStep('completed');
  return { action: 'reset' };
}
