import '../mocks';
import React from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import OAuthRehydration from '../../../app/components/Views/OAuthRehydration';
import { initialStateOAuthRehydration } from '../presets/oauthRehydration';

const mockUnlockWallet = jest.fn();
const mockGetAuthType = jest.fn();
const mockRequestBiometricsAccessControlForIOS = jest.fn();
const mockUpdateAuthPreference = jest.fn();
const mockPromptSeedlessRelogin = jest.fn();
const mockResetOauthState = jest.fn();
const mockGetMarketingOptInStatus = jest.fn();
const mockTrackOnboarding = jest.fn();
const mockIsAnalyticsEnabled = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('../../../app/core/Authentication/hooks/useAuthentication', () => ({
  __esModule: true,
  default: () => ({
    unlockWallet: mockUnlockWallet,
    getAuthType: mockGetAuthType,
    requestBiometricsAccessControlForIOS:
      mockRequestBiometricsAccessControlForIOS,
    updateAuthPreference: mockUpdateAuthPreference,
  }),
}));

jest.mock('../../../app/components/hooks/SeedlessHooks', () => ({
  usePromptSeedlessRelogin: () => ({
    isDeletingInProgress: false,
    promptSeedlessRelogin: mockPromptSeedlessRelogin,
  }),
}));

jest.mock('../../../app/components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    isEnabled: () => mockIsAnalyticsEnabled(),
  }),
}));

jest.mock('../../../app/core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    resetOauthState: () => mockResetOauthState(),
    getMarketingOptInStatus: () => mockGetMarketingOptInStatus(),
  },
}));

jest.mock('../../../app/util/metrics/TrackOnboarding/trackOnboarding', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockTrackOnboarding(...args),
}));

jest.mock('../../../app/util/trace', () => ({
  trace: jest.fn(async (_config: unknown, fn?: () => Promise<void> | void) =>
    fn ? await fn() : undefined,
  ),
  endTrace: jest.fn(),
  TraceName: {
    LoginUserInteraction: 'LoginUserInteraction',
    AuthenticateUser: 'AuthenticateUser',
    OnboardingPasswordLoginAttempt: 'OnboardingPasswordLoginAttempt',
    OnboardingPasswordLoginError: 'OnboardingPasswordLoginError',
    OnboardingExistingSocialLogin: 'OnboardingExistingSocialLogin',
    OnboardingJourneyOverall: 'OnboardingJourneyOverall',
  },
  TraceOperation: {
    Login: 'Login',
    OnboardingUserJourney: 'OnboardingUserJourney',
    OnboardingError: 'OnboardingError',
  },
}));

jest.mock('../../../app/images/branding/fox.png', () => 'fox-logo');
jest.mock(
  '../../../app/images/branding/metamask-name.png',
  () => 'metamask-name',
);

export const oauthRehydrationViewMocks = {
  unlockWallet: mockUnlockWallet,
  getAuthType: mockGetAuthType,
  requestBiometricsAccessControlForIOS:
    mockRequestBiometricsAccessControlForIOS,
  updateAuthPreference: mockUpdateAuthPreference,
  promptSeedlessRelogin: mockPromptSeedlessRelogin,
  resetOauthState: mockResetOauthState,
  getMarketingOptInStatus: mockGetMarketingOptInStatus,
  trackOnboarding: mockTrackOnboarding,
  isAnalyticsEnabled: mockIsAnalyticsEnabled,
  useNetInfo: useNetInfo as jest.Mock,
};

export function resetOAuthRehydrationViewMocks() {
  Object.values(oauthRehydrationViewMocks).forEach((mockValue) => {
    if (typeof mockValue === 'function' && 'mockReset' in mockValue) {
      (mockValue as jest.Mock).mockReset();
    }
  });

  mockUnlockWallet.mockResolvedValue(undefined);
  mockGetAuthType.mockResolvedValue({
    currentAuthType: 'password',
    availableBiometryType: null,
  });
  mockRequestBiometricsAccessControlForIOS.mockResolvedValue('password');
  mockUpdateAuthPreference.mockResolvedValue(undefined);
  mockGetMarketingOptInStatus.mockResolvedValue({ is_opt_in: false });
  mockIsAnalyticsEnabled.mockReturnValue(false);
  (useNetInfo as jest.Mock).mockReturnValue({
    isConnected: true,
    isInternetReachable: true,
  });
}

interface RenderOAuthRehydrationViewOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
}

interface RenderOAuthRehydrationViewWithRoutesOptions
  extends RenderOAuthRehydrationViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<unknown> }[];
}

export function renderOAuthRehydrationView(
  options: RenderOAuthRehydrationViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, initialParams } = options;
  const builder = initialStateOAuthRehydration();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    OAuthRehydration as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.REHYDRATE },
    { state },
    {
      locked: false,
      oauthLoginSuccess: true,
      ...initialParams,
    },
  );
}

export function renderOAuthRehydrationViewWithRoutes(
  options: RenderOAuthRehydrationViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, initialParams, extraRoutes } = options;
  const builder = initialStateOAuthRehydration();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    OAuthRehydration as unknown as React.ComponentType,
    { name: Routes.ONBOARDING.REHYDRATE },
    extraRoutes,
    { state },
    {
      locked: false,
      oauthLoginSuccess: true,
      ...initialParams,
    },
  );
}
