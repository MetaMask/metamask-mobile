import '../mocks';
import React, { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { createMockRouteMessenger } from '../../../app/util/test/mock-route-messenger';
import AccountStatus from '../../../app/components/Views/AccountStatus';
import ChoosePassword from '../../../app/components/Views/ChoosePassword';
import WalletCreationError from '../../../app/components/Views/WalletCreationError';
import MetaMetricsAndDataCollectionSection from '../../../app/components/Views/Settings/SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import type { AccountStatusParams } from '../../../app/components/Views/AccountStatus/types';
import { AuthConnection } from '../../../app/core/OAuthService/OAuthInterface';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../app/constants/navigation';
import { AccountType } from '../../../app/constants/onboarding';
import { ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY } from '../../../app/components/Views/OnboardingInterestQuestionnaire/abTestConfig';
import Engine from '../../../app/core/Engine';
import {
  initialStateSeedlessOnboarding,
  initialStateSeedlessSecuritySettings,
  SEEDLESS_CV_ACCESS_TOKEN,
} from '../presets/seedlessOnboarding';

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

interface ChoosePasswordRendererOptions {
  overrides?: DeepPartial<RootState>;
  routeParams?: Record<string, unknown>;
  /** Overrides the default `GeolocationController:refreshGeolocation` mock. */
  geolocationMock?: jest.Mock;
}

function choosePasswordProviderValues(
  options: ChoosePasswordRendererOptions = {},
) {
  return {
    state: buildSeedlessOnboardingState(options),
    routeMessenger: createMockRouteMessenger({
      'GeolocationController:refreshGeolocation':
        options.geolocationMock ?? jest.fn().mockResolvedValue('US'),
    }),
  };
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
    choosePasswordProviderValues(options),
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
    choosePasswordProviderValues(options),
    options.routeParams,
  );
}

interface SecuritySettingsMarketingSectionRendererOptions {
  /** Local marketing preference before the user toggles. */
  dataCollectionForMarketing?: boolean;
  overrides?: DeepPartial<RootState>;
}

/**
 * Renders the Settings > Security & privacy MetaMetrics + marketing section
 * (MetaMetricsAndDataCollectionSection) for a social-login user. The modal
 * flow route is registered so toggling marketing consent off can navigate to
 * the data-collection confirmation sheet.
 */
export function renderSecuritySettingsMarketingSection(
  options: SecuritySettingsMarketingSectionRendererOptions = {},
) {
  syncSeedlessAccessToken();

  const builder = initialStateSeedlessSecuritySettings({
    dataCollectionForMarketing: options.dataCollectionForMarketing,
  });
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }

  return renderScreenWithRoutes(
    MetaMetricsAndDataCollectionSection as unknown as React.ComponentType,
    { name: Routes.SETTINGS.SECURITY_SETTINGS },
    [{ name: Routes.MODAL.ROOT_MODAL_FLOW }],
    { state: builder.build() },
  );
}
