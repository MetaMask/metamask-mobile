import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView.js';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet.js';
import SocialLoginView from '../../page-objects/Onboarding/SocialLoginView.js';
import { setupAppleExistingUserOAuthMock } from './helpers/seedless-helpers.js';

appiumTest.describe(
  SmokeSeedlessOnboarding('Apple Login - Existing User'),
  () => {
    appiumTest(
      'shows Account Already Exists screen for existing Apple user',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder({ onboarding: true }).build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupAppleExistingUserOAuthMock,
          },
          async () => {
            await Assertions.expectElementToBeVisible(
              OnboardingView.container,
              {
                description: 'Onboarding screen should be visible',
              },
            );

            await OnboardingView.tapCreateWallet();

            await Assertions.expectElementToBeVisible(
              OnboardingSheet.container,
              {
                description:
                  'Onboarding sheet with social login options should appear',
              },
            );

            await OnboardingSheet.tapAppleLoginButton();

            await SocialLoginView.isAccountFoundScreenVisible();

            await Assertions.expectElementToBeVisible(
              SocialLoginView.accountFoundTitle,
              {
                description: 'Account found title should be visible',
              },
            );

            await Assertions.expectElementToBeVisible(
              SocialLoginView.accountFoundLoginButton,
              {
                description: 'Login button should be visible',
              },
            );

            await Assertions.expectElementToBeVisible(
              SocialLoginView.accountFoundDifferentMethodButton,
              {
                description:
                  'Use different login method button should be visible',
              },
            );
          },
        );
      },
    );

    appiumTest(
      'can tap Login button on Account Already Exists screen',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder({ onboarding: true }).build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupAppleExistingUserOAuthMock,
          },
          async () => {
            await Assertions.expectElementToBeVisible(
              OnboardingView.container,
              {
                description: 'Onboarding screen should be visible',
              },
            );

            await OnboardingView.tapCreateWallet();

            await Assertions.expectElementToBeVisible(
              OnboardingSheet.container,
              {
                description: 'Onboarding sheet should appear',
              },
            );

            await OnboardingSheet.tapAppleLoginButton();

            await SocialLoginView.isAccountFoundScreenVisible();

            await SocialLoginView.tapLoginButton();
          },
        );
      },
    );
  },
);
