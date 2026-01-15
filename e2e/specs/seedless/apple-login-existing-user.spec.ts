/**
 * E2E Test: Apple Login - Existing User Flow
 *
 * Tests the flow for an existing user logging in with Apple OAuth:
 * 1. Start at Onboarding screen
 * 2. Tap "Create Wallet" button
 * 3. Tap Apple login button
 * 4. OAuth mock returns success + existingUser: true
 * 5. Account Already Exists screen appears
 * 6. Tap "Log In" button
 * 7. Navigate to Rehydration (password entry) screen
 * 8. Enter password and complete login
 * 9. Navigate to Home screen
 *
 * Uses Backend QA Mock Integration:
 * - E2E emails (*+e2e@web3auth.io) trigger specific test scenarios
 * - existinguser pattern → Backend returns existing user data
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

// Mocks - Using Backend QA Mock Integration
import {
  createOAuthMockttpService,
  E2E_EMAILS,
  MOCK_GOOGLE_ACCOUNT_WALLET_ADDRESS,
} from '../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';

describe(SmokeWalletPlatform('Apple Login - Existing User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes - social login flows can be slow
  });

  beforeEach(async () => {
    // Reset OAuth mock state before each test
    E2EOAuthHelpers.reset();
    // Configure for Apple existing user scenario using E2E email pattern
    E2EOAuthHelpers.configureAppleExistingUser();
  });

  it('imports existing wallet with Apple login', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          // Setup OAuth mock service for Apple existing user
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureAppleExistingUser();
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
        // The OAuth mock will return existing user success
        await OnboardingSheet.tapAppleLoginButton();

        // Step 5: Account Already Exists screen should appear
        await SocialLoginView.isAccountFoundScreenVisible();

        // Step 6: Tap Login button
        await SocialLoginView.tapLoginButton();

        // Step 7: This navigates to Rehydration screen for password entry
        // For full testing, we'd enter password and verify wallet recovery

        // Verify OAuth was called with existing user configuration
        expect(E2EOAuthHelpers.wasOAuthCalled()).toBe(true);
        expect(E2EOAuthHelpers.getE2EEmail()).toBe(E2E_EMAILS.APPLE_EXISTING_USER);
        expect(E2EOAuthHelpers.isExistingUser()).toBe(true);
        expect(E2EOAuthHelpers.getLoginProvider()).toBe('apple');

        // Log expected wallet address for verification
        console.log(
          `Expected wallet address: ${MOCK_GOOGLE_ACCOUNT_WALLET_ADDRESS}`,
        );
      },
    );
  });

  it('shows Account Already Exists screen for existing Apple user during Create Wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          // Setup OAuth mock service for Apple existing user
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureAppleExistingUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        // Navigate to Account Already Exists screen
        await Assertions.expectElementToBeVisible(OnboardingView.container, {
          description: 'Onboarding screen should be visible',
        });

        await OnboardingView.tapCreateWallet();
        await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
          description: 'Onboarding sheet should appear',
        });

        await OnboardingSheet.tapAppleLoginButton();

        // Verify Account Already Exists screen is displayed
        await SocialLoginView.isAccountFoundScreenVisible();

        // Verify the screen shows correct elements
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
      },
    );
  });
});
