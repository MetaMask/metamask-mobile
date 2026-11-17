import { authEnv } from '../apiEnv';
import Engine from '../Engine';
import { SOCIAL_IDENTIFIER_ISSUERS } from '../Engine/controllers/mfa-recovery-controller/auth/identifiers';
import type { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { linkSocialLogin } from './linkSocialLogin';

/** Matched by name: the SDK error class may not survive the controller boundary. */
const NOT_PAIRED_ERROR_NAME = 'SocialIdentifierNotPairedError';

export type EnsureSocialLoginLinkedResult =
  | 'not_social'
  | 'already_linked'
  | 'linked';

export interface EnsureSocialLoginLinkedOptions {
  /**
   * Returns the email Auth is asked to link instead of the token's own, or
   * `undefined` to link with the token's email. Asked only when linking.
   */
  getVerifierId?: () => Promise<string | undefined>;
}

/**
 * Whether the seedless social login is paired to an Auth profile. Exchanging
 * the social token fails with `SocialIdentifierNotPairedError` when it is not.
 *
 * @returns `false` when the login was never paired.
 * @throws When the exchange fails for any other reason.
 */
export async function isSocialLoginLinked(): Promise<boolean> {
  try {
    await Engine.context.AuthenticationController.exchangeSocialAccessToken();
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === NOT_PAIRED_ERROR_NAME) {
      return false;
    }
    throw error;
  }
}

/**
 * Links the seedless social login to the Auth profile when it is not linked
 * yet, so Auth lists it as a recovery identifier.
 *
 * @param service - Provides the verification session linking needs.
 * @param options - Optional email override for the link.
 * @returns What was done.
 */
export async function ensureSocialLoginLinked(
  service: MfaRecoveryService,
  { getVerifierId }: EnsureSocialLoginLinkedOptions = {},
): Promise<EnsureSocialLoginLinkedResult> {
  const { SeedlessOnboardingController, AuthenticationController } =
    Engine.context;
  const seedlessState = SeedlessOnboardingController.state;
  const { authConnection } = seedlessState;
  if (
    !seedlessState.vault ||
    !authConnection ||
    !SOCIAL_IDENTIFIER_ISSUERS[authConnection]
  ) {
    return 'not_social';
  }

  if (await isSocialLoginLinked()) {
    return 'already_linked';
  }

  // Auth needs an aal2 token to attach a login once the profile has a factor.
  await service.verifyMfa();
  const verifierId = (await getVerifierId?.())?.trim() || undefined;
  await linkSocialLogin({
    env: authEnv(),
    seedlessState,
    getSocialAccessToken: () => SeedlessOnboardingController.getAccessToken(),
    getVerifiedAccessToken: () =>
      AuthenticationController.getVerificationToken()?.accessToken,
    verifierId,
  });
  return 'linked';
}
