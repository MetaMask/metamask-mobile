import type { SeedlessOnboardingController } from '@metamask/seedless-onboarding-controller';

/** The seedless controller methods the password steps call. */
export type MfaRecoveryPasswordSeedless = Pick<
  SeedlessOnboardingController,
  'resetPasswordWithVaultKeys'
>;

export type MfaRecoveryPasswordStep = 'resetting_password' | 'completed';

export interface MfaRecoveryPasswordResult {
  action: 'reset';
}

/**
 * Makes `newPassword` the global password of the envelope-managed vault after
 * `recoverWithRecoverySecret`, using the aal2 recovery session.
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
