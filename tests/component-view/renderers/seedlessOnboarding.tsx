import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderScreenWithRoutes } from '../render';
import AccountStatus from '../../../app/components/Views/AccountStatus';
import SocialLoginIosUser from '../../../app/components/Views/SocialLoginIosUser';
import type { AccountStatusParams } from '../../../app/components/Views/AccountStatus/types';
import { AuthConnection } from '../../../app/core/OAuthService/OAuthInterface';
import { initialStateSeedlessOnboarding } from '../presets/seedlessOnboarding';

const ACCOUNT_ALREADY_EXISTS_ROUTE = 'AccountAlreadyExists';

interface SeedlessOnboardingRendererOptions {
  overrides?: DeepPartial<RootState>;
  routeParams?: AccountStatusParams;
}

function buildSeedlessOnboardingState(
  options: SeedlessOnboardingRendererOptions = {},
) {
  const builder = initialStateSeedlessOnboarding();
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }
  return builder.build();
}

export function renderAccountAlreadyExists(
  options: SeedlessOnboardingRendererOptions = {},
) {
  const defaultParams: AccountStatusParams = {
    type: 'found',
    provider: AuthConnection.Google,
    accountName: 'seedless-cv@example.com',
    oauthLoginSuccess: true,
  };

  return renderScreenWithRoutes(
    AccountStatus as unknown as React.ComponentType,
    { name: ACCOUNT_ALREADY_EXISTS_ROUTE },
    [{ name: Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE }],
    { state: buildSeedlessOnboardingState(options) },
    { ...defaultParams, ...options.routeParams },
  );
}

const SocialLoginSuccessNewUser = () => <SocialLoginIosUser type="new" />;

interface SocialLoginIosUserRendererOptions {
  overrides?: DeepPartial<RootState>;
  routeParams?: {
    accountName?: string;
    oauthLoginSuccess?: boolean;
    provider?: string;
  };
}

export function renderSocialLoginIosNewUser(
  options: SocialLoginIosUserRendererOptions = {},
) {
  const defaultParams = {
    accountName: 'seedless-cv@example.com',
    oauthLoginSuccess: true,
    provider: AuthConnection.Google,
  };

  return renderScreenWithRoutes(
    SocialLoginSuccessNewUser as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER },
    [{ name: Routes.ONBOARDING.CHOOSE_PASSWORD }],
    { state: buildSeedlessOnboardingState(options) },
    { ...defaultParams, ...options.routeParams },
  );
}
