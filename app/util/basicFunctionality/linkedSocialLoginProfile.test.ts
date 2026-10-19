import type {
  AuthenticationControllerState,
  ProfileSignInInfo,
} from '@metamask/profile-sync-controller/auth';

import type { RootExtendedMessenger } from '../../core/Engine/types';
import {
  authenticationStateIncludesLinkedSocialLogin,
  profileAliasesIncludeSocialLogin,
  registerLinkedSocialLoginProfileSync,
} from './linkedSocialLoginProfile';

const createProfileAliases = (
  identifierTypes: string[],
): ProfileSignInInfo['profileAliases'] => [
  {
    aliasProfileId: 'alias-profile-id',
    canonicalProfileId: 'canonical-profile-id',
    identifierIds: identifierTypes.map((type) => ({
      id: `${type}-id`,
      type,
    })),
  },
];

const createAuthenticationState = (
  pairedIdentifierTypes: string[],
): AuthenticationControllerState =>
  ({
    isSignedIn: true,
    srpSessionData: {
      entropySourceId: {
        profile: {
          identifierId: 'identifier-id',
          metaMetricsId: 'metrics-id',
          profileId: 'profile-id',
          canonicalProfileId: 'profile-id',
          pairedIdentifierIds: pairedIdentifierTypes.map((type) => ({
            id: `${type}-id`,
            type,
          })),
        },
        token: {
          accessToken: 'access-token',
          expiresIn: 3600,
          obtainedAt: 1,
        },
      },
    },
  }) as AuthenticationControllerState;

const createMessenger = (initialAuthState: AuthenticationControllerState) => {
  const subscribe = jest.fn();
  const call = jest.fn().mockReturnValue(initialAuthState);
  const messenger = { call, subscribe } as unknown as RootExtendedMessenger;
  return { messenger, call, subscribe };
};

describe('linkedSocialLoginProfile', () => {
  it('detects social identifiers in authentication state', () => {
    const authState = createAuthenticationState(['APPLE']);

    const result = authenticationStateIncludesLinkedSocialLogin(authState);

    expect(result).toBe(true);
  });

  it('ignores authentication state containing only an SRP identifier', () => {
    const authState = createAuthenticationState(['SRP']);

    const result = authenticationStateIncludesLinkedSocialLogin(authState);

    expect(result).toBe(false);
  });

  it('reports linked social identifiers already persisted in authentication state', () => {
    const onLinkedSocialLoginProfile = jest.fn();
    const { messenger, call } = createMessenger(
      createAuthenticationState(['GOOGLE']),
    );

    registerLinkedSocialLoginProfileSync(messenger, onLinkedSocialLoginProfile);

    expect(call).toHaveBeenCalledWith('AuthenticationController:getState');
    expect(onLinkedSocialLoginProfile).toHaveBeenCalledTimes(1);
  });

  it('does not report when persisted authentication state has no social identifier', () => {
    const onLinkedSocialLoginProfile = jest.fn();
    const { messenger } = createMessenger(createAuthenticationState(['SRP']));

    registerLinkedSocialLoginProfileSync(messenger, onLinkedSocialLoginProfile);

    expect(onLinkedSocialLoginProfile).not.toHaveBeenCalled();
  });

  it('reports linked social identifiers from authentication state changes', () => {
    const onLinkedSocialLoginProfile = jest.fn();
    const { messenger, subscribe } = createMessenger(
      createAuthenticationState([]),
    );
    registerLinkedSocialLoginProfileSync(messenger, onLinkedSocialLoginProfile);
    const stateChangeHandler = subscribe.mock.calls.find(
      ([eventName]) => eventName === 'AuthenticationController:stateChange',
    )?.[1] as (authState: AuthenticationControllerState) => void;

    stateChangeHandler(createAuthenticationState(['GOOGLE']));

    expect(onLinkedSocialLoginProfile).toHaveBeenCalledTimes(1);
  });

  it('detects social identifiers in profile aliases', () => {
    const profileAliases = createProfileAliases(['SRP', 'TELEGRAM']);

    const result = profileAliasesIncludeSocialLogin(profileAliases);

    expect(result).toBe(true);
  });

  it('ignores profile aliases containing only an SRP identifier', () => {
    const profileAliases = createProfileAliases(['SRP']);

    const result = profileAliasesIncludeSocialLogin(profileAliases);

    expect(result).toBe(false);
  });

  it('reports linked social identifiers from the aliases reported at sign-in', () => {
    const onLinkedSocialLoginProfile = jest.fn();
    const { messenger, subscribe } = createMessenger(
      createAuthenticationState([]),
    );
    registerLinkedSocialLoginProfileSync(messenger, onLinkedSocialLoginProfile);
    const profileSignInHandler = subscribe.mock.calls.find(
      ([eventName]) => eventName === 'AuthenticationController:profileSignIn',
    )?.[1] as (profileSignInInfo: ProfileSignInInfo) => void;

    profileSignInHandler({
      profileId: 'profile-id',
      profileIdChanged: false,
      profileAliases: createProfileAliases(['APPLE']),
    });

    expect(onLinkedSocialLoginProfile).toHaveBeenCalledTimes(1);
  });

  it('does not report a sign-in whose aliases have no social identifier', () => {
    const onLinkedSocialLoginProfile = jest.fn();
    const { messenger, subscribe } = createMessenger(
      createAuthenticationState([]),
    );
    registerLinkedSocialLoginProfileSync(messenger, onLinkedSocialLoginProfile);
    const profileSignInHandler = subscribe.mock.calls.find(
      ([eventName]) => eventName === 'AuthenticationController:profileSignIn',
    )?.[1] as (profileSignInInfo: ProfileSignInInfo) => void;

    profileSignInHandler({
      profileId: 'profile-id',
      profileIdChanged: false,
      profileAliases: createProfileAliases(['SRP']),
    });

    expect(onLinkedSocialLoginProfile).not.toHaveBeenCalled();
  });
});
