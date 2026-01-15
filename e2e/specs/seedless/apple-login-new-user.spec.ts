/**
 * E2E Test: Apple Login - New User Onboarding Flow
 *
 * Tests the complete flow for a new user signing up with Apple OAuth:
 * 1. Start at Onboarding screen
 * 2. Tap "Create Wallet" button
 * 3. Tap Apple login button
 * 4. OAuth mock returns success + existingUser: false
 * 5. (iOS) Social Login Success screen appears → tap "Set MetaMask PIN"
 * 6. (Android) Directly navigates to ChoosePassword
 * 7. Complete password creation
 * 8. Navigate to Onboarding Success / Home
 *
 * Uses Backend QA Mock Integration:
 * - E2E emails (*+e2e@web3auth.io) trigger specific test scenarios
 * - Backend generates valid tokens using SignerService
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

// Mocks - Using Backend QA Mock Integration
import { createOAuthMockttpService, E2E_EMAILS } from '../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';

const TEST_PASSWORD = 'Test123!@#';

describe(SmokeWalletPlatform('Apple Login - New User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes - social login flows can be slow
  });

  beforeEach(async () => {
    // Reset OAuth mock state before each test
    E2EOAuthHelpers.reset();
    // Configure for Apple new user scenario using E2E email pattern
    E2EOAuthHelpers.configureAppleNewUser();
  });

  it('creates a new wallet with Apple login', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          // Setup OAuth mock service for Apple new user
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureAppleNewUser();
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

        // Step 4: Tap Apple login button
        // The OAuth mock will return success with E2E email
        await OnboardingSheet.tapAppleLoginButton();

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
        try {
          await Assertions.expectElementToBeVisible(
            MetaMetricsOptInView.container,
            { description: 'MetaMetrics opt-in screen', timeout: 10000 },
          );
          await MetaMetricsOptInView.tapAgreeButton();
        } catch {
          // May not appear in all flows
        }

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

        // Verify OAuth was called with correct E2E email
        expect(E2EOAuthHelpers.wasOAuthCalled()).toBe(true);
        expect(E2EOAuthHelpers.getE2EEmail()).toBe(E2E_EMAILS.APPLE_NEW_USER);
        expect(E2EOAuthHelpers.isExistingUser()).toBe(false);
        expect(E2EOAuthHelpers.getLoginProvider()).toBe('apple');
      },
    );
  });
});
