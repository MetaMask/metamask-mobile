import type { Messenger } from '@metamask/messenger';
import type {
  RecoveryApproval,
  RecoveryAuthProvider,
} from '@metamask/mfa-recovery-controller';
import type {
  AuthenticationControllerRefreshCanonicalProfileIdAction,
  AuthenticationControllerRequestMfaApprovalAction,
} from '@metamask/profile-sync-controller/auth';
import type { CubistSessionTokenProvider } from './cubist-escrow-provider';

export type AuthenticationRecoveryAuthProviderMessenger = Messenger<
  'AuthApiRecoveryAuthProvider',
  | AuthenticationControllerRefreshCanonicalProfileIdAction
  | AuthenticationControllerRequestMfaApprovalAction
>;

export interface AuthenticationRecoveryAuthProviderOptions {
  messenger: AuthenticationRecoveryAuthProviderMessenger;
}

/**
 * Requests recovery approvals directly through `AuthenticationController`.
 * A missing or stale MFA verification rejects with its `StepUpRequiredError`.
 */
export class AuthenticationRecoveryAuthProvider
  implements RecoveryAuthProvider
{
  readonly #messenger: AuthenticationRecoveryAuthProviderMessenger;

  constructor({ messenger }: AuthenticationRecoveryAuthProviderOptions) {
    this.#messenger = messenger;
  }

  /**
   * Resolves the canonical profile id from the server, since the cached one
   * can be stale after pairing on another device.
   *
   * @returns The canonical profile id, which approvals use as `sub`.
   */
  async getAuthenticatedProfileId(): Promise<string> {
    const profileId = await this.#messenger.call(
      'AuthenticationController:refreshCanonicalProfileId',
    );
    return profileId;
  }

  /**
   * @param params - Request hash, audiences, and MFA requirement.
   * @returns The approval and current recovery identifiers.
   */
  async authorizeRecoveryRequest(
    params: Parameters<RecoveryAuthProvider['authorizeRecoveryRequest']>[0],
  ): Promise<RecoveryApproval> {
    const { approval, identifiers = [] } = await this.#messenger.call(
      'AuthenticationController:requestMfaApproval',
      {
        requestHash: params.requestHash,
        audiences: params.audiences,
        requireVerification: params.requireTwoFactor === true,
        reason: { operation: 'mfa_recovery' },
      },
    );
    return { approval, identifiers };
  }
}

/**
 * Builds the Cubist session token source. The registration service accepts
 * the profile JWT, not an MFA approval, so the access token is the bearer
 * token.
 */
export function createCubistSessionTokenProvider(
  authProvider: RecoveryAuthProvider,
  getBearerToken: () => Promise<string>,
): CubistSessionTokenProvider {
  return {
    getAuthenticatedProfileId: async () =>
      await authProvider.getAuthenticatedProfileId(),
    getAccessToken: async () => await getBearerToken(),
  };
}
