'use strict';
import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';
import { asDetoxElement } from '../../../framework/EncapsulatedElement';

import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../../page-objects/Onboarding/SocialLoginView';

import { SmokeSeedlessOnboarding } from '../../../tags';
import { createOAuthMockttpService } from '../../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../../module-mocking/oauth';
import { googleLoginExistingUserAnalyticsExpectations } from '../../../helpers/analytics/expectations/google-login-existing-user.analytics';

describe(
  SmokeSeedlessOnboarding('Analytics - Google Social Login Existing User'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(300000);
    });

    beforeEach(async () => {
      E2EOAuthHelpers.reset();
      // The module mock generates a random email that the API mock will proxy
      // to the QA backend using the existing-user email, making the backend
      // return existing-user metadata and triggering the Account Already Exists flow.
      E2EOAuthHelpers.configureGoogleNewUser();
    });

    it('tracks analytics events during Google social login existing-user flow', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder({ onboarding: true }).build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            const oAuthMockttpService = createOAuthMockttpService();
            oAuthMockttpService.configureGoogleExistingUser();
            await oAuthMockttpService.setup(mockServer);
          },
          analyticsExpectations: googleLoginExistingUserAnalyticsExpectations,
        },
        async () => {
          await Assertions.expectElementToBeVisible(OnboardingView.container, {
            description: 'Onboarding screen should be visible',
          });

          await OnboardingView.tapCreateWallet();

          await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
            description: 'Onboarding sheet should appear',
          });

          await OnboardingSheet.tapGoogleLoginButton();

          // The API mock returns existing-user data, so the AccountAlreadyExists
          // screen should appear — no ChoosePassword screen is navigated to.
          await SocialLoginView.isAccountFoundScreenVisible();

          await Assertions.expectElementToBeVisible(
            asDetoxElement(SocialLoginView.accountFoundTitle),
            {
              description: 'Account Already Exists title should be visible',
            },
          );
        },
      );
    });
  },
);
