'use strict';
import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';

import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../../page-objects/Onboarding/SocialLoginView';
import LoginView from '../../../page-objects/wallet/LoginView';
import WalletView from '../../../page-objects/wallet/WalletView';

import { createOAuthMockttpService } from '../../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../../module-mocking/oauth';
import { SmokeSeedlessAnalytics } from '../../../tags';
import {
  completeSocialLoginOnboarding,
  lockAndResetWalletToOnboarding,
  TEST_PASSWORD,
} from '../utils';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeaturePredictGtmOnboardingModalDisabled } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { googleOAuthRehydrationSuccessAnalyticsExpectations } from '../../../helpers/analytics/expectations/oauth-rehydration.analytics';

describe(SmokeSeedlessAnalytics('Analytics - Google OAuth rehydration'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureGoogleNewUser();
  });

  it('tracks Rehydration Password Attempted and Completed after Account Already Exists unlock', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleNewUser();
          await oAuthMockttpService.setup(mockServer);
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeaturePredictGtmOnboardingModalDisabled(),
          );
        },
        analyticsExpectations:
          googleOAuthRehydrationSuccessAnalyticsExpectations,
      },
      async () => {
        await completeSocialLoginOnboarding('google');

        await lockAndResetWalletToOnboarding();

        await OnboardingView.tapCreateWallet();

        await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
          description: 'Onboarding sheet should appear for second login',
        });

        await OnboardingSheet.tapGoogleLoginButton();

        await SocialLoginView.isAccountFoundScreenVisible();

        await SocialLoginView.tapAccountFoundLoginButton();

        await Assertions.expectElementToBeVisible(LoginView.container, {
          description:
            'OAuth rehydration login screen should be visible after tapping Login',
          timeout: 30000,
        });

        await LoginView.enterPassword(TEST_PASSWORD);

        await LoginView.tapLoginButton();

        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet should load after successful rehydration',
          timeout: 60000,
        });
      },
    );
  });
});
