import type {
  AuthenticationControllerState,
  ProfileSignInInfo,
} from '@metamask/profile-sync-controller/auth';

import type { RootExtendedMessenger } from '../../core/Engine/types';

const SOCIAL_LOGIN_IDENTIFIER_TYPES = new Set(['GOOGLE', 'APPLE', 'TELEGRAM']);

interface PairedIdentifier {
  type: string;
}

/**
 * Returns whether profile aliases include a social-login identifier.
 *
 * @param profileAliases - Aliases returned after profile sign-in or pairing.
 * @returns Whether at least one alias is linked to a social provider.
 */
export function profileAliasesIncludeSocialLogin(
  profileAliases: ProfileSignInInfo['profileAliases'] | undefined,
): boolean {
  return Boolean(
    profileAliases?.some((alias) =>
      alias.identifierIds.some((identifier) =>
        SOCIAL_LOGIN_IDENTIFIER_TYPES.has(identifier.type),
      ),
    ),
  );
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
 * persisted marker.
 *
 * @param messenger - Root Engine messenger.
 * @param onLinkedSocialLoginProfile - Called when linked social metadata is
 * detected.
 */
export function registerLinkedSocialLoginProfileSync(
  messenger: RootExtendedMessenger,
  onLinkedSocialLoginProfile: () => void,
): void {
  messenger.subscribe(
    'AuthenticationController:profileSignIn',
    ({ profileAliases }) => {
      if (profileAliasesIncludeSocialLogin(profileAliases)) {
        onLinkedSocialLoginProfile();
      }
    },
  );

  messenger.subscribe('AuthenticationController:stateChange', (authState) => {
    if (authenticationStateIncludesLinkedSocialLogin(authState)) {
      onLinkedSocialLoginProfile();
    }
  });
}
