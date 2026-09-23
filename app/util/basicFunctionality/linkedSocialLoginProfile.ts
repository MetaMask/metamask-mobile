import type { AuthenticationControllerState } from '@metamask/profile-sync-controller/auth';

import type { RootExtendedMessenger } from '../../core/Engine/types';

const SOCIAL_LOGIN_IDENTIFIER_TYPES = new Set(['GOOGLE', 'APPLE', 'TELEGRAM']);

interface PairedIdentifier {
  type: string;
}

/**
 * Returns whether AuthenticationController state includes a linked social
 * identifier for any SRP session.
 *
 * @param authState - AuthenticationController state after sign-in.
 * @returns Whether a session profile is linked to a social provider.
 */
export function authenticationStateIncludesLinkedSocialLogin(
  authState: AuthenticationControllerState,
): boolean {
  return Object.values(authState.srpSessionData ?? {}).some((session) => {
    // Core exposes this field at runtime after SRP sign-in. Remove the cast
    // once profile-sync-controller exports it on UserProfile.
    const pairedIdentifierIds = (
      session.profile as {
        pairedIdentifierIds?: readonly PairedIdentifier[];
      }
    ).pairedIdentifierIds;

    return pairedIdentifierIds?.some((identifier) =>
      SOCIAL_LOGIN_IDENTIFIER_TYPES.has(identifier.type),
    );
  });
}

/**
 * Mirrors AuthenticationController social-profile signals into a client-owned
 * persisted marker. Checks the current state first because subscriptions do
 * not replay persisted state.
 *
 * @param messenger - Root Engine messenger.
 * @param onLinkedSocialLoginProfile - Called when linked social metadata is
 * detected.
 */
export function registerLinkedSocialLoginProfileSync(
  messenger: RootExtendedMessenger,
  onLinkedSocialLoginProfile: () => void,
): void {
  if (
    authenticationStateIncludesLinkedSocialLogin(
      messenger.call('AuthenticationController:getState'),
    )
  ) {
    onLinkedSocialLoginProfile();
  }

  messenger.subscribe('AuthenticationController:stateChange', (authState) => {
    if (authenticationStateIncludesLinkedSocialLogin(authState)) {
      onLinkedSocialLoginProfile();
    }
  });
}
