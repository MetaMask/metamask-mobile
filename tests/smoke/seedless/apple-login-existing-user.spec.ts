import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { asDetoxElement } from '../../framework/EncapsulatedElement';

import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../page-objects/Onboarding/SocialLoginView';

import { createOAuthMockttpService } from '../../api-mocking/seedless-onboarding';
import { E2E_EMAILS } from '../../api-mocking/seedless-onboarding/constants';
import { SmokeSeedlessOnboarding } from '../../tags';

const EXISTING_USER_EMAIL = E2E_EMAILS.APPLE_EXISTING_USER;

// eslint-disable-next-line jest/no-disabled-tests -- skipped until existing-user E2E flow is stable
describe.skip(SmokeSeedlessOnboarding('Apple Login - Existing User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  it('shows Account Already Exists screen for existing Apple user', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        launchArgs: { mockOAuthEmail: EXISTING_USER_EMAIL },
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureAppleExistingUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        await Assertions.expectElementToBeVisible(OnboardingView.container, {
          description: 'Onboarding screen should be visible',
        });

        await OnboardingView.tapCreateWallet();

        await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
          description:
            'Onboarding sheet with social login options should appear',
        });

        await OnboardingSheet.tapAppleLoginButton();

        await SocialLoginView.isAccountFoundScreenVisible();

        await Assertions.expectElementToBeVisible(
          asDetoxElement(SocialLoginView.accountFoundTitle),
          {
            description: 'Account found title should be visible',
          },
        );

        await Assertions.expectElementToBeVisible(
          asDetoxElement(SocialLoginView.accountFoundLoginButton),
          {
            description: 'Login button should be visible',
          },
        );

        await Assertions.expectElementToBeVisible(
          asDetoxElement(SocialLoginView.accountFoundDifferentMethodButton),
          {
            description: 'Use different login method button should be visible',
          },
        );
      },
    );
  });

  it('can tap Login button on Account Already Exists screen', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        launchArgs: { mockOAuthEmail: EXISTING_USER_EMAIL },
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureAppleExistingUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        await Assertions.expectElementToBeVisible(OnboardingView.container, {
          description: 'Onboarding screen should be visible',
        });

        await OnboardingView.tapCreateWallet();

        await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
          description: 'Onboarding sheet should appear',
        });

        await OnboardingSheet.tapAppleLoginButton();

        await SocialLoginView.isAccountFoundScreenVisible();

        await SocialLoginView.tapLoginButton();

        console.log('[E2E] Login button tapped successfully');
      },
    );
  });
});
