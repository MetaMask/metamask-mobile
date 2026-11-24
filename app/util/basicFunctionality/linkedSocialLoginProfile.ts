import type {
  AuthenticationControllerState,
  ProfileSignInInfo,
} from '@metamask/profile-sync-controller/auth';

import type { RootExtendedMessenger } from '../../core/Engine/types';

const SOCIAL_LOGIN_IDENTIFIER_TYPES = new Set(['GOOGLE', 'APPLE', 'TELEGRAM']);

/**
 * Returns whether the profile aliases reported at sign-in include a social
 * identifier.
 *
 * Aliases are available on `profileSignIn` before restored session state is
 * guaranteed to carry `pairedIdentifierIds`.
 *
 * @param profileAliases - Aliases from the profileSignIn event.
 * @returns Whether an alias is paired with a social provider.
 */
export function profileAliasesIncludeSocialLogin(
  profileAliases: ProfileSignInInfo['profileAliases'],
): boolean {
  return profileAliases.some((alias) =>
    alias.identifierIds?.some((identifier) =>
      SOCIAL_LOGIN_IDENTIFIER_TYPES.has(identifier.type),
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
  return Object.values(authState.srpSessionData ?? {}).some((session) =>
    session.profile.pairedIdentifierIds?.some((identifier) =>
      SOCIAL_LOGIN_IDENTIFIER_TYPES.has(identifier.type),
    ),
  );
}

/**
 * Mirrors AuthenticationController social-profile signals into a client-owned
 * persisted marker. Checks the current state first because subscriptions do
 * not replay persisted state, then watches both the stored paired identifiers
 * and the aliases reported at sign-in.
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

  messenger.subscribe(
    'AuthenticationController:profileSignIn',
    ({ profileAliases }) => {
      if (profileAliasesIncludeSocialLogin(profileAliases)) {
        onLinkedSocialLoginProfile();
      }
    },
  );
}
