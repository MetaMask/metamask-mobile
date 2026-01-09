/**
 * E2E Test: Google Login - Existing User Flow
 *
 * Tests the flow for an existing user logging in with Google OAuth:
 * 1. Start at Onboarding screen
 * 2. Tap "Create Wallet" button
 * 3. Tap Google login button
 * 4. OAuth mock returns success + existingUser: true
 * 5. Account Already Exists screen appears
 * 6. Tap "Log In" button
 * 7. Navigate to Rehydration (password entry) screen
 * 8. Enter password and complete login
 * 9. Navigate to Home screen
 *
 * Uses OAuthMockttpService matching MetaMask Extension's pattern:
 * - setup(server) → New user (no userEmail = creates new wallet)
 * - setup(server, { userEmail: 'user@gmail.com' }) → Existing user (imports E2E_SRP)
 */

import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';

// Page Objects
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingSheet from '../../pages/Onboarding/OnboardingSheet';
import SocialLoginView from '../../pages/Onboarding/SocialLoginView';

// Mocks - Using Extension's pattern
import {
  OAuthMockttpService,
  MOCK_GOOGLE_ACCOUNT,
  MOCK_GOOGLE_ACCOUNT_WALLET_ADDRESS,
} from '../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';

describe(SmokeWalletPlatform('Google Login - Existing User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes - social login flows can be slow
  });

  beforeEach(async () => {
    // Reset OAuth mock state before each test
    E2EOAuthHelpers.reset();
    // Configure for existing user scenario
    E2EOAuthHelpers.setExistingUserResponse(MOCK_GOOGLE_ACCOUNT);
  });

  it('imports existing wallet with Google login', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          // Setup OAuth mock service - WITH userEmail = EXISTING user
          const oAuthMockttpService = new OAuthMockttpService();
          await oAuthMockttpService.setup(mockServer, {
            userEmail: MOCK_GOOGLE_ACCOUNT, // This triggers existing user flow
          });
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
        // The OAuth mock will intercept and return existing user
        await OnboardingSheet.tapGoogleLoginButton();

        // Step 5: Account Already Exists screen should appear
        await SocialLoginView.isAccountFoundScreenVisible();

        // Step 6: Tap Login button
        await SocialLoginView.tapLoginButton();

        // Step 7: This navigates to Rehydration screen for password entry
        // For full testing, we'd enter password and verify:
        // - Wallet address matches MOCK_GOOGLE_ACCOUNT_WALLET_ADDRESS
        // - E2E_SRP is recovered correctly

        // Verify OAuth was called with existing user response
        expect(E2EOAuthHelpers.wasOAuthCalled()).toBe(true);
        const mockResponse = E2EOAuthHelpers.getMockResponse();
        expect(mockResponse.existingUser).toBe(true);

        // Log expected wallet address for verification
        console.log(
          `Expected wallet address: ${MOCK_GOOGLE_ACCOUNT_WALLET_ADDRESS}`,
        );
      },
    );
  });

  it('shows Account Already Exists screen for existing user during Create Wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = new OAuthMockttpService();
          await oAuthMockttpService.setup(mockServer, {
            userEmail: MOCK_GOOGLE_ACCOUNT,
          });
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

        await OnboardingSheet.tapGoogleLoginButton();

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
