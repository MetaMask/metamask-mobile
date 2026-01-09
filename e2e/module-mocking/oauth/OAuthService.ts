/**
 * Mock OAuthService for E2E testing
 *
 * This mock replaces the real OAuthService during E2E builds
 * (IS_TEST=true or METAMASK_ENVIRONMENT=e2e) via metro.config.js aliasing.
 *
 * Use E2EOAuthHelpers to configure mock behavior before tests:
 * - E2EOAuthHelpers.setNewUserResponse() - for new user onboarding flow
 * - E2EOAuthHelpers.setExistingUserResponse() - for existing user login flow
 * - E2EOAuthHelpers.setErrorResponse() - for error handling tests
 * - E2EOAuthHelpers.reset() - reset to default state
 */

import {
  HandleOAuthLoginResult,
  OAuthLoginResultType,
} from '../../../app/core/OAuthService/OAuthInterface';
import { BaseLoginHandler } from '../../../app/core/OAuthService/OAuthLoginHandlers/baseHandler';

// Mock response configuration
interface MockOAuthResponse {
  type: OAuthLoginResultType;
  existingUser: boolean;
  accountName: string;
  error?: string;
}

// Default mock response (new user success)
let mockResponse: MockOAuthResponse = {
  type: OAuthLoginResultType.SUCCESS,
  existingUser: false,
  accountName: 'testuser@example.com',
};

// Flag to track if OAuth was called (for test assertions)
let oauthCalled = false;
let lastLoginHandler: BaseLoginHandler | null = null;

/**
 * E2E OAuth Helpers - Use these to configure mock OAuth responses in tests
 */
export const E2EOAuthHelpers = {
  /**
   * Configure mock to return a successful new user response
   * Use this for testing the "Create Wallet" flow with Google/Apple login
   */
  setNewUserResponse: (accountName = 'newuser@example.com'): void => {
    mockResponse = {
      type: OAuthLoginResultType.SUCCESS,
      existingUser: false,
      accountName,
    };
  },

  /**
   * Configure mock to return a successful existing user response
   * Use this for testing the "Import Wallet" flow with Google/Apple login
   */
  setExistingUserResponse: (accountName = 'existinguser@example.com'): void => {
    mockResponse = {
      type: OAuthLoginResultType.SUCCESS,
      existingUser: true,
      accountName,
    };
  },

  /**
   * Configure mock to return an error response
   * Use this for testing OAuth error handling
   */
  setErrorResponse: (errorMessage = 'OAuth login failed'): void => {
    mockResponse = {
      type: OAuthLoginResultType.ERROR,
      existingUser: false,
      accountName: '',
      error: errorMessage,
    };
  },

  /**
   * Reset mock to default state (new user success)
   */
  reset: (): void => {
    mockResponse = {
      type: OAuthLoginResultType.SUCCESS,
      existingUser: false,
      accountName: 'testuser@example.com',
    };
    oauthCalled = false;
    lastLoginHandler = null;
  },

  /**
   * Check if OAuth login was called during the test
   */
  wasOAuthCalled: (): boolean => oauthCalled,

  /**
   * Get the last login handler that was used
   */
  getLastLoginHandler: (): BaseLoginHandler | null => lastLoginHandler,

  /**
   * Get the current mock response configuration
   */
  getMockResponse: (): MockOAuthResponse => ({ ...mockResponse }),
};

// Mock OAuthService class matching real OAuthService interface
class MockOAuthService {
  public localState: {
    userId?: string;
    accountName?: string;
    loginInProgress: boolean;
    oauthLoginSuccess: boolean;
    oauthLoginError: string | null;
    userClickedRehydration?: boolean;
  } = {
    loginInProgress: false,
    userId: undefined,
    accountName: undefined,
    oauthLoginSuccess: false,
    oauthLoginError: null,
    userClickedRehydration: false,
  };

  public config = {
    authConnectionConfig: {},
    web3AuthNetwork: 'sapphire_mainnet',
    authServerUrl: 'https://mock-auth-server.metamask.io',
  };

  updateLocalState = (state: Partial<typeof this.localState>): void => {
    this.localState = { ...this.localState, ...state };
  };

  resetOauthState = (): void => {
    this.localState = {
      loginInProgress: false,
      userId: undefined,
      accountName: undefined,
      oauthLoginSuccess: false,
      oauthLoginError: null,
      userClickedRehydration: false,
    };
  };

  /**
   * Mock handleOAuthLogin - returns configured mock response
   * Configure response using E2EOAuthHelpers before calling this
   */
  handleOAuthLogin = async (
    loginHandler: BaseLoginHandler,
    userClickedRehydration: boolean,
  ): Promise<HandleOAuthLoginResult> => {
    // Track that OAuth was called
    oauthCalled = true;
    lastLoginHandler = loginHandler;

    // Update state to simulate login in progress
    this.updateLocalState({
      loginInProgress: true,
      userClickedRehydration,
    });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return configured mock response
    const result: HandleOAuthLoginResult = {
      type: mockResponse.type,
      existingUser: mockResponse.existingUser,
      accountName: mockResponse.accountName,
      error: mockResponse.error,
    };

    // Update local state based on result
    if (result.type === OAuthLoginResultType.SUCCESS) {
      this.updateLocalState({
        loginInProgress: false,
        oauthLoginSuccess: true,
        oauthLoginError: null,
        accountName: result.accountName,
      });
    } else {
      this.updateLocalState({
        loginInProgress: false,
        oauthLoginSuccess: false,
        oauthLoginError: result.error || 'Unknown error',
      });
    }

    return result;
  };

  /**
   * Mock reset method
   */
  reset = (): void => {
    this.resetOauthState();
  };

  /**
   * Mock updateMarketingOptIn - no-op for E2E tests
   */
  updateMarketingOptIn = async (): Promise<void> => {
    // No-op for E2E tests
  };
}

// Export singleton instance (matching real OAuthService export pattern)
const OAuthLoginService = new MockOAuthService();
export default OAuthLoginService;

// Also export the class for type compatibility
export { MockOAuthService as OAuthService };
