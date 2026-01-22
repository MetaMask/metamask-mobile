import { OAuthLoginResultType } from '../../../app/core/OAuthService/OAuthInterface';

// ============================================
// E2E EMAIL PATTERNS
// ============================================

/**
 * E2E Test Email Patterns
 */
export const E2E_EMAILS = {
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
} as const;

/**
 * E2E Test Scenarios
 */
export enum E2EScenario {
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
export enum E2ELoginProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

/**
 * E2E OAuth Configuration
 */
export interface E2EOAuthConfig {
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

/**
 * E2E OAuth Helpers - Configure mock behavior before tests
 */
export const E2EOAuthHelpers = {
  // ============================================
  // GOOGLE CONFIGURATION
  // ============================================

  /**
   * Configure for Google New User flow
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
   */
  configureAppleExistingUser: (): void => {
    currentConfig = {
      loginProvider: E2ELoginProvider.APPLE,
      scenario: E2EScenario.EXISTING_USER,
      email: E2E_EMAILS.APPLE_EXISTING_USER,
      shouldSucceed: true,
    };
  },

  /**
   * Configure for error scenario
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
   * Mark OAuth as called (used by login handlers)
   */
  markOAuthCalled: (): void => {
    oauthCalled = true;
  },

  /**
   * Get mock response (for compatibility)
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
