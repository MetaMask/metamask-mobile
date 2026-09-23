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
          pairedIdentifierIds: pairedIdentifierTypes.map((type) => ({ type })),
        },
        token: {
          accessToken: 'access-token',
          expiresIn: 3600,
          obtainedAt: 1,
        },
      },
    },
  }) as AuthenticationControllerState;

const createProfileSignInInfo = (
  identifierTypes: string[],
): ProfileSignInInfo => ({
  profileId: 'profile-id',
  profileIdChanged: false,
  profileAliases: [
    {
      aliasProfileId: 'alias-profile-id',
      canonicalProfileId: 'profile-id',
      identifierIds: identifierTypes.map((type) => ({
        id: `${type}-identifier`,
        type,
      })),
    },
  ],
});

describe('linkedSocialLoginProfile', () => {
  it('detects social identifiers in profile aliases', () => {
    const profileSignInInfo = createProfileSignInInfo(['SRP', 'GOOGLE']);

    const result = profileAliasesIncludeSocialLogin(
      profileSignInInfo.profileAliases,
    );

    expect(result).toBe(true);
  });

  it('ignores aliases containing only SRP identifiers', () => {
    const profileSignInInfo = createProfileSignInInfo(['SRP']);

    const result = profileAliasesIncludeSocialLogin(
      profileSignInInfo.profileAliases,
    );

    expect(result).toBe(false);
  });

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

  it('reports linked social aliases from profile sign-in events', () => {
    const subscribe = jest.fn();
    const onLinkedSocialLoginProfile = jest.fn();
    const messenger = { subscribe } as unknown as RootExtendedMessenger;
    registerLinkedSocialLoginProfileSync(messenger, onLinkedSocialLoginProfile);
    const profileSignInHandler = subscribe.mock.calls.find(
      ([eventName]) => eventName === 'AuthenticationController:profileSignIn',
    )?.[1] as (profileSignInInfo: ProfileSignInInfo) => void;

    profileSignInHandler(createProfileSignInInfo(['TELEGRAM']));

    expect(onLinkedSocialLoginProfile).toHaveBeenCalledTimes(1);
  });

  it('reports linked social identifiers from authentication state changes', () => {
    const subscribe = jest.fn();
    const onLinkedSocialLoginProfile = jest.fn();
    const messenger = { subscribe } as unknown as RootExtendedMessenger;
    registerLinkedSocialLoginProfileSync(messenger, onLinkedSocialLoginProfile);
    const stateChangeHandler = subscribe.mock.calls.find(
      ([eventName]) => eventName === 'AuthenticationController:stateChange',
    )?.[1] as (authState: AuthenticationControllerState) => void;

    stateChangeHandler(createAuthenticationState(['GOOGLE']));

    expect(onLinkedSocialLoginProfile).toHaveBeenCalledTimes(1);
  });
});
