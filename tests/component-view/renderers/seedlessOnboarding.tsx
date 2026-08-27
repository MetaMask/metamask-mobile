import '../mocks';
import React, { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import AccountStatus from '../../../app/components/Views/AccountStatus';
import SocialLoginIosUser from '../../../app/components/Views/SocialLoginIosUser';
import ChoosePassword from '../../../app/components/Views/ChoosePassword';
import WalletCreationError from '../../../app/components/Views/WalletCreationError';
import type { AccountStatusParams } from '../../../app/components/Views/AccountStatus/types';
import { AuthConnection } from '../../../app/core/OAuthService/OAuthInterface';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../app/constants/navigation';
import { AccountType } from '../../../app/constants/onboarding';
import {
  initialStateSeedlessOnboarding,
  SEEDLESS_CV_ACCESS_TOKEN,
} from '../presets/seedlessOnboarding';
import { ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY } from '../../../app/components/Views/OnboardingInterestQuestionnaire/abTestConfig';
import Engine from '../../../app/core/Engine';

const ACCOUNT_ALREADY_EXISTS_ROUTE = 'AccountAlreadyExists';
const ACCOUNT_NOT_FOUND_ROUTE = 'AccountNotFound';
export const ONBOARDING_PREVIOUS_PROBE_ID =
  'seedless-onboarding-previous-probe';

interface SeedlessOnboardingStateOptions {
  overrides?: DeepPartial<RootState>;
}

interface SeedlessOnboardingRendererOptions
  extends SeedlessOnboardingStateOptions {
  routeParams?: AccountStatusParams;
}

function buildSeedlessOnboardingState(
  options: SeedlessOnboardingStateOptions = {},
) {
  const builder = initialStateSeedlessOnboarding().withRemoteFeatureFlags({
    [ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY]: 'treatment',
  });
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }
  return builder.build();
}

function syncSeedlessAccessToken() {
  if (Engine.context.SeedlessOnboardingController?.state) {
    Engine.context.SeedlessOnboardingController.state.accessToken =
      SEEDLESS_CV_ACCESS_TOKEN;
  }
}

export function renderAccountAlreadyExists(
  options: SeedlessOnboardingRendererOptions = {},
) {
  syncSeedlessAccessToken();

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

function OnboardingPreviousProbe() {
  return <Text testID={ONBOARDING_PREVIOUS_PROBE_ID}>Onboarding</Text>;
}

function AccountAlreadyExistsFromOnboardingHarness({
  routeParams,
}: {
  routeParams: AccountStatusParams;
}) {
  const navigation = useNavigation();
  const didNavigate = useRef(false);

  useEffect(() => {
    if (didNavigate.current) {
      return;
    }
    didNavigate.current = true;
    navigation.navigate(ACCOUNT_ALREADY_EXISTS_ROUTE, routeParams);
  }, [navigation, routeParams]);

  return <OnboardingPreviousProbe />;
}

export function renderAccountAlreadyExistsWithOnboardingHistory(
  options: SeedlessOnboardingRendererOptions = {},
) {
  syncSeedlessAccessToken();

  const defaultParams: AccountStatusParams = {
    type: 'found',
    provider: AuthConnection.Google,
    accountName: 'seedless-cv@example.com',
    oauthLoginSuccess: true,
  };
  const mergedParams = { ...defaultParams, ...options.routeParams };

  function Harness() {
    return (
      <AccountAlreadyExistsFromOnboardingHarness routeParams={mergedParams} />
    );
  }

  return renderScreenWithRoutes(
    Harness as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.ONBOARDING },
    [
      { name: ACCOUNT_ALREADY_EXISTS_ROUTE, Component: AccountStatus },
      { name: Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE },
    ],
    { state: buildSeedlessOnboardingState(options) },
  );
}

export function renderAccountNotFound(
  options: SeedlessOnboardingRendererOptions = {},
) {
  syncSeedlessAccessToken();

  const defaultParams: AccountStatusParams = {
    type: 'not_exist',
    provider: AuthConnection.Google,
    accountName: 'seedless-cv@example.com',
    oauthLoginSuccess: true,
  };

  return renderScreenWithRoutes(
    AccountStatus as unknown as React.ComponentType,
    { name: ACCOUNT_NOT_FOUND_ROUTE },
    [{ name: Routes.ONBOARDING.CHOOSE_PASSWORD }],
    { state: buildSeedlessOnboardingState(options) },
    { ...defaultParams, ...options.routeParams },
  );
}

const SocialLoginSuccessNewUser = () => <SocialLoginIosUser type="new" />;
const SocialLoginSuccessExistingUser = () => (
  <SocialLoginIosUser type="existing" />
);

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
  syncSeedlessAccessToken();

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

export function renderSocialLoginIosExistingUser(
  options: SocialLoginIosUserRendererOptions = {},
) {
  syncSeedlessAccessToken();

  const defaultParams = {
    accountName: 'seedless-cv@example.com',
    oauthLoginSuccess: true,
    provider: AuthConnection.Google,
  };

  return renderScreenWithRoutes(
    SocialLoginSuccessExistingUser as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_EXISTING_USER },
    [{ name: Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE }],
    { state: buildSeedlessOnboardingState(options) },
    { ...defaultParams, ...options.routeParams },
  );
}

interface ChoosePasswordRendererOptions {
  overrides?: DeepPartial<RootState>;
  routeParams?: Record<string, unknown>;
}

export function renderChoosePasswordForSocialLogin(
  options: ChoosePasswordRendererOptions = {},
) {
  syncSeedlessAccessToken();

  const defaultParams = {
    [PREVIOUS_SCREEN]: ONBOARDING,
    oauthLoginSuccess: true,
    provider: AuthConnection.Google,
  };

  return renderScreenWithRoutes(
    ChoosePassword as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.CHOOSE_PASSWORD },
    [
      { name: Routes.ONBOARDING.INTEREST_QUESTIONNAIRE },
      { name: Routes.ONBOARDING.SUCCESS_FLOW },
    ],
    { state: buildSeedlessOnboardingState(options) },
    { ...defaultParams, ...options.routeParams },
  );
}

interface WalletCreationErrorRendererOptions {
  overrides?: DeepPartial<RootState>;
  routeParams?: {
    metricsEnabled?: boolean;
    error?: Error;
    accountType?: AccountType;
  };
}

export function renderSocialLoginWalletCreationError(
  options: WalletCreationErrorRendererOptions = {},
) {
  syncSeedlessAccessToken();

  const defaultParams = {
    metricsEnabled: true,
    error: new Error('Seedless wallet creation failed'),
    accountType: AccountType.MetamaskGoogle,
  };

  return renderScreenWithRoutes(
    WalletCreationError as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.WALLET_CREATION_ERROR },
    [{ name: Routes.ONBOARDING.ROOT_NAV }],
    { state: buildSeedlessOnboardingState(options) },
    { ...defaultParams, ...options.routeParams },
  );
}

export function renderChoosePasswordScreen(
  options: ChoosePasswordRendererOptions = {},
) {
  return renderComponentViewScreen(
    ChoosePassword as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.CHOOSE_PASSWORD },
    { state: buildSeedlessOnboardingState(options) },
    options.routeParams,
  );
}
