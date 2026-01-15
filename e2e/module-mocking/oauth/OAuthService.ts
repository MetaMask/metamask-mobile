/**
 * Mock OAuthService for E2E testing
 *
 * This mock replaces OAuthLoginService during E2E builds via metro.config.js aliasing.
 * (IS_TEST=true or METAMASK_ENVIRONMENT=e2e)
 *
 * KEY INTEGRATION WITH BACKEND QA MOCK:
 * - Uses E2E email patterns (*+e2e@web3auth.io) that backend recognizes
 * - Email prefix determines test scenario (newuser, existinguser, error.*)
 * - Backend QA mock generates real, valid tokens
 *
 * Usage:
 *   E2EOAuthHelpers.configureGoogleNewUser();     // Google + new user
 *   E2EOAuthHelpers.configureAppleExistingUser(); // Apple + existing user
 *   E2EOAuthHelpers.configureError('timeout');    // Error scenarios
 *   E2EOAuthHelpers.reset();                      // Reset to default
 */

import {
  HandleOAuthLoginResult,
  OAuthLoginResultType,
} from '../../../app/core/OAuthService/OAuthInterface';
import { BaseLoginHandler } from '../../../app/core/OAuthService/OAuthLoginHandlers/baseHandler';

// ============================================
// E2E EMAIL PATTERNS (matching constants.ts)
// ============================================

/**
 * E2E Test Email Patterns
 * Must match pattern: /^[a-zA-Z0-9._-]+\+e2e@web3auth\.io$/
 */
const E2E_EMAILS = {
  // Google Login
  GOOGLE_NEW_USER: 'google.newuser+e2e@web3auth.io',
  GOOGLE_EXISTING_USER: 'google.existinguser+e2e@web3auth.io',

  // Apple Login
  APPLE_NEW_USER: 'apple.newuser+e2e@web3auth.io',
  APPLE_EXISTING_USER: 'apple.existinguser+e2e@web3auth.io',

  // Error scenarios
  ERROR_TIMEOUT: 'error.timeout+e2e@web3auth.io',
  ERROR_INVALID_TOKEN: 'error.invalid+e2e@web3auth.io',
  ERROR_NETWORK: 'error.network+e2e@web3auth.io',
  ERROR_AUTH_FAILED: 'error.authfailed+e2e@web3auth.io',
};

/**
 * E2E Test Scenarios
 */
enum E2EScenario {
  NEW_USER = 'new_user',
  EXISTING_USER = 'existing_user',
  ERROR_TIMEOUT = 'error_timeout',
  ERROR_INVALID = 'error_invalid',
  ERROR_NETWORK = 'error_network',
  ERROR_AUTH_FAILED = 'error_auth_failed',
}

/**
 * Login Providers
 */
enum E2ELoginProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

// ============================================
// CONFIGURATION STATE
// ============================================

/**
 * E2E OAuth Configuration
 */
interface E2EOAuthConfig {
  loginProvider: E2ELoginProvider;
  scenario: E2EScenario;
  email: string;
  shouldSucceed: boolean;
  errorMessage?: string;
}

// Current configuration - defaults to Google new user
let currentConfig: E2EOAuthConfig = {
  loginProvider: E2ELoginProvider.GOOGLE,
  scenario: E2EScenario.NEW_USER,
  email: E2E_EMAILS.GOOGLE_NEW_USER,
  shouldSucceed: true,
};

// Tracking for test assertions
let oauthCalled = false;
let lastLoginHandler: BaseLoginHandler | null = null;
let callHistory: Array<{ handler: BaseLoginHandler; config: E2EOAuthConfig }> =
  [];

// ============================================
// E2E OAUTH HELPERS
// ============================================

/**
 * E2E OAuth Helpers - Configure mock behavior before tests
 *
 * These helpers set up the mock to use specific E2E email patterns
 * that the backend QA mock recognizes.
 */
export const E2EOAuthHelpers = {
  // ============================================
  // GOOGLE CONFIGURATION
  // ============================================

  /**
   * Configure for Google New User flow
   * Uses email: google.newuser+e2e@web3auth.io
   */
  configureGoogleNewUser: (): void => {
    currentConfig = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: E2EScenario.NEW_USER,
      email: E2E_EMAILS.GOOGLE_NEW_USER,
      shouldSucceed: true,
    };
  },

  /**
   * Configure for Google Existing User flow
   * Uses email: google.existinguser+e2e@web3auth.io
   */
  configureGoogleExistingUser: (): void => {
    currentConfig = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: E2EScenario.EXISTING_USER,
      email: E2E_EMAILS.GOOGLE_EXISTING_USER,
      shouldSucceed: true,
    };
  },

  // ============================================
  // APPLE CONFIGURATION
  // ============================================

  /**
   * Configure for Apple New User flow
   * Uses email: apple.newuser+e2e@web3auth.io
   */
  configureAppleNewUser: (): void => {
    currentConfig = {
      loginProvider: E2ELoginProvider.APPLE,
      scenario: E2EScenario.NEW_USER,
      email: E2E_EMAILS.APPLE_NEW_USER,
      shouldSucceed: true,
    };
  },

  /**
   * Configure for Apple Existing User flow
   * Uses email: apple.existinguser+e2e@web3auth.io
   */
  configureAppleExistingUser: (): void => {
    currentConfig = {
      loginProvider: E2ELoginProvider.APPLE,
      scenario: E2EScenario.EXISTING_USER,
      email: E2E_EMAILS.APPLE_EXISTING_USER,
      shouldSucceed: true,
    };
  },

  // ============================================
  // ERROR CONFIGURATION
  // ============================================

  /**
   * Configure for error scenario
   * @param errorType - Type of error to simulate
   * @param errorMessage - Optional custom error message
   */
  configureError: (
    errorType: 'timeout' | 'invalid' | 'network' | 'auth_failed',
    errorMessage?: string,
  ): void => {
    const errorEmails: Record<string, string> = {
      timeout: E2E_EMAILS.ERROR_TIMEOUT,
      invalid: E2E_EMAILS.ERROR_INVALID_TOKEN,
      network: E2E_EMAILS.ERROR_NETWORK,
      auth_failed: E2E_EMAILS.ERROR_AUTH_FAILED,
    };

    const errorScenarios: Record<string, E2EScenario> = {
      timeout: E2EScenario.ERROR_TIMEOUT,
      invalid: E2EScenario.ERROR_INVALID,
      network: E2EScenario.ERROR_NETWORK,
      auth_failed: E2EScenario.ERROR_AUTH_FAILED,
    };

    currentConfig = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: errorScenarios[errorType],
      email: errorEmails[errorType],
      shouldSucceed: false,
      errorMessage: errorMessage || `OAuth ${errorType} error`,
    };
  },

  // ============================================
  // LEGACY METHODS (backward compatibility)
  // ============================================

  /**
   * @deprecated Use configureGoogleNewUser() instead
   */
  setNewUserResponse: (accountName?: string): void => {
    E2EOAuthHelpers.configureGoogleNewUser();
    if (accountName) {
      currentConfig.email = accountName;
    }
  },

  /**
   * @deprecated Use configureGoogleExistingUser() instead
   */
  setExistingUserResponse: (accountName?: string): void => {
    E2EOAuthHelpers.configureGoogleExistingUser();
    if (accountName) {
      currentConfig.email = accountName;
    }
  },

  /**
   * @deprecated Use configureError() instead
   */
  setErrorResponse: (errorMessage = 'OAuth login failed'): void => {
    E2EOAuthHelpers.configureError('auth_failed', errorMessage);
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Reset to default state (Google new user)
   */
  reset: (): void => {
    currentConfig = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: E2EScenario.NEW_USER,
      email: E2E_EMAILS.GOOGLE_NEW_USER,
      shouldSucceed: true,
    };
    oauthCalled = false;
    lastLoginHandler = null;
    callHistory = [];
  },

  /**
   * Get current configuration
   */
  getConfig: (): E2EOAuthConfig => ({ ...currentConfig }),

  /**
   * Get the E2E email that will be used
   */
  getE2EEmail: (): string => currentConfig.email,

  /**
   * Check if configured for existing user
   */
  isExistingUser: (): boolean =>
    currentConfig.scenario === E2EScenario.EXISTING_USER,

  /**
   * Check if configured for error scenario
   */
  isErrorScenario: (): boolean => !currentConfig.shouldSucceed,

  /**
   * Get login provider
   */
  getLoginProvider: (): string => currentConfig.loginProvider,

  /**
   * Check if OAuth was called
   */
  wasOAuthCalled: (): boolean => oauthCalled,

  /**
   * Get the last login handler used
   */
  getLastLoginHandler: (): BaseLoginHandler | null => lastLoginHandler,

  /**
   * Get call history for debugging
   */
  getCallHistory: (): Array<{
    handler: BaseLoginHandler;
    config: E2EOAuthConfig;
  }> => [...callHistory],

  /**
   * @deprecated Use getConfig() instead
   */
  getMockResponse: () => ({
    type: currentConfig.shouldSucceed
      ? OAuthLoginResultType.SUCCESS
      : OAuthLoginResultType.ERROR,
    existingUser: currentConfig.scenario === E2EScenario.EXISTING_USER,
    accountName: currentConfig.email,
    error: currentConfig.errorMessage,
  }),
};

// ============================================
// MOCK OAUTH SERVICE CLASS
// ============================================

/**
 * Mock OAuthService class
 * Matches the interface of the real OAuthLoginService
 */
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
    // UAT environment for E2E tests
    authServerUrl: 'https://auth-service.uat-api.cx.metamask.io',
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
   * Mock handleOAuthLogin
   *
   * This method:
   * 1. Tracks that OAuth was called (for test assertions)
   * 2. Returns the configured E2E email as accountName
   * 3. The email pattern tells backend QA mock which scenario to use
   *
   * @param loginHandler - The login handler (Google/Apple)
   * @param userClickedRehydration - Whether user clicked rehydration
   * @returns Mock OAuth result
   */
  handleOAuthLogin = async (
    loginHandler: BaseLoginHandler,
    userClickedRehydration: boolean,
  ): Promise<HandleOAuthLoginResult> => {
    // Track call for test assertions
    oauthCalled = true;
    lastLoginHandler = loginHandler;
    callHistory.push({ handler: loginHandler, config: { ...currentConfig } });

    // Update state to simulate login in progress
    this.updateLocalState({
      loginInProgress: true,
      userClickedRehydration,
    });

    // Simulate network delay (shorter for E2E tests)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Build result based on current configuration
    const result: HandleOAuthLoginResult = currentConfig.shouldSucceed
      ? {
          type: OAuthLoginResultType.SUCCESS,
          existingUser: currentConfig.scenario === E2EScenario.EXISTING_USER,
          accountName: currentConfig.email,
        }
      : {
          type: OAuthLoginResultType.ERROR,
          existingUser: false,
          accountName: '',
          error: currentConfig.errorMessage,
        };

    // Update local state based on result
    if (result.type === OAuthLoginResultType.SUCCESS) {
      this.updateLocalState({
        loginInProgress: false,
        oauthLoginSuccess: true,
        oauthLoginError: null,
        accountName: result.accountName,
        userId: result.accountName, // Use email as userId for E2E
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
   * Reset OAuth state
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
