import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { asDetoxElement } from '../../framework/EncapsulatedElement';

import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../page-objects/Onboarding/SocialLoginView';

import { createOAuthMockttpService } from '../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeSeedlessOnboarding } from '../../tags';
import {
  completeSocialLoginOnboarding,
  lockAndResetWalletToOnboarding,
} from './utils';

describe(SmokeSeedlessOnboarding('Apple Login - Existing User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureAppleNewUser();
  });

  it('registers new user then re-logins as existing user and sees Account Already Exists', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureAppleNewUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        await completeSocialLoginOnboarding('apple');

        await lockAndResetWalletToOnboarding();

        await OnboardingView.tapCreateWallet();

        await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
          description: 'Onboarding sheet should appear for second login',
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
});
