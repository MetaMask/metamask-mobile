import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import Assertions from '../../../tests/framework/Assertions';

// Page Objects
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingSheet from '../../pages/Onboarding/OnboardingSheet';
import SocialLoginView from '../../pages/Onboarding/SocialLoginView';

// Mocks
import { createOAuthMockttpService } from '../../../tests/api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';

describe(SmokeWalletPlatform('Google Login - Existing User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureGoogleExistingUser();
  });

  it('shows Account Already Exists screen for existing Google user', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleExistingUser();
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

        await OnboardingSheet.tapGoogleLoginButton();

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
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleExistingUser();
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

        await OnboardingSheet.tapGoogleLoginButton();

        await SocialLoginView.isAccountFoundScreenVisible();

        await SocialLoginView.tapLoginButton();

        console.log('[E2E] Login button tapped successfully');
      },
    );
  });
});
