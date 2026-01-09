/**
 * E2E Test: Google Login - New User Onboarding Flow
 *
 * Tests the complete flow for a new user signing up with Google OAuth:
 * 1. Start at Onboarding screen
 * 2. Tap "Create Wallet" button
 * 3. Tap Google login button
 * 4. OAuth mock returns success + existingUser: false
 * 5. (iOS) Social Login Success screen appears → tap "Set MetaMask PIN"
 * 6. (Android) Directly navigates to ChoosePassword
 * 7. Complete password creation
 * 8. Navigate to Onboarding Success / Home
 *
 * Uses OAuthMockttpService matching MetaMask Extension's pattern:
 * - setup(server) → New user (no userEmail = creates new wallet)
 * - setup(server, { userEmail: 'user@gmail.com' }) → Existing user
 */

import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';

// Page Objects
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingSheet from '../../pages/Onboarding/OnboardingSheet';
import SocialLoginView from '../../pages/Onboarding/SocialLoginView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import MetaMetricsOptInView from '../../pages/Onboarding/MetaMetricsOptInView';
import ExperienceEnhancerBottomSheet from '../../pages/Onboarding/ExperienceEnhancerBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import TermsOfUseModal from '../../pages/Onboarding/TermsOfUseModal';

// Mocks - Using Extension's pattern
import { OAuthMockttpService } from '../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';

const TEST_PASSWORD = 'Test123!@#';

describe(SmokeWalletPlatform('Google Login - New User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes - social login flows can be slow
  });

  beforeEach(async () => {
    // Reset OAuth mock state before each test
    E2EOAuthHelpers.reset();
    // Configure for new user scenario
    E2EOAuthHelpers.setNewUserResponse('newuser@gmail.com');
  });

  it('creates a new wallet with Google login', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          // Setup OAuth mock service - NO userEmail = NEW user
          const oAuthMockttpService = new OAuthMockttpService();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        // Step 1: Verify we're on Onboarding screen
        await Assertions.expectElementToBeVisible(OnboardingView.container, {
          description: 'Onboarding screen should be visible',
        });

        // Step 2: Tap "Create Wallet" button
        await OnboardingView.tapCreateWallet();

        // Step 3: OnboardingSheet should appear with social login options
        await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
          description:
            'Onboarding sheet with social login options should appear',
        });

        // Step 4: Tap Google login button
        // The OAuth mock will intercept and return new user success
        await OnboardingSheet.tapGoogleLoginButton();

        // Step 5: Handle platform-specific flow
        const isIOS = device.getPlatform() === 'ios';

        if (isIOS) {
          // iOS shows Social Login Success screen first
          await SocialLoginView.isIosNewUserScreenVisible();
          await SocialLoginView.tapIosNewUserSetPinButton();
        }

        // Step 6: ChoosePassword screen should appear
        await Assertions.expectElementToBeVisible(
          CreatePasswordView.container,
          {
            description: 'Password creation screen should be visible',
          },
        );

        // Step 7: Create password
        await CreatePasswordView.enterPassword(TEST_PASSWORD);
        await CreatePasswordView.reEnterPassword(TEST_PASSWORD);

        // Accept terms if shown
        try {
          await TermsOfUseModal.tapAgreeCheckBox();
          await TermsOfUseModal.tapAcceptButton();
        } catch {
          // Terms modal may not appear in all flows
        }

        // Tap Create Password button
        await CreatePasswordView.tapCreatePasswordButton();

        // Step 8: Handle onboarding completion screens
        // MetaMetrics opt-in - for seedless onboarding, we just tap agree
        try {
          await Assertions.expectElementToBeVisible(
            MetaMetricsOptInView.container,
            { description: 'MetaMetrics opt-in screen', timeout: 10000 },
          );
          await MetaMetricsOptInView.tapAgreeButton();
        } catch {
          // May not appear in all flows
        }

        // Experience enhancer - tap agree to continue
        try {
          await ExperienceEnhancerBottomSheet.tapIAgree();
        } catch {
          // May not appear in all flows
        }

        // Step 9: Should reach Onboarding Success or Home screen
        try {
          await Assertions.expectElementToBeVisible(
            OnboardingSuccessView.container,
            {
              description: 'Onboarding success screen should be visible',
              timeout: 30000,
            },
          );
          await OnboardingSuccessView.tapDone();
        } catch {
          // May go directly to home in some flows
        }

        // Final verification: Home screen / Wallet view is visible
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible after onboarding',
          timeout: 30000,
        });

        // Verify OAuth was called
        expect(E2EOAuthHelpers.wasOAuthCalled()).toBe(true);
      },
    );
  });
});
