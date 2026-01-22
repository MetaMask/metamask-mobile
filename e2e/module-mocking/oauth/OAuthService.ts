/**
 * Mock OAuthService for E2E testing
 *
 * NOTE: This file is NO LONGER aliased in metro.config.js.
 * The real OAuthService is used, which calls:
 * OAuthLoginHandlers (mocked) for native OAuth UI bypass
 *
 * This file is kept for backwards compatibility with tests that
 * import E2EOAuthHelpers from here.
 */

// Re-export everything from the shared helpers
export {
  E2EOAuthHelpers,
  E2E_EMAILS,
  E2EScenario,
  E2ELoginProvider,
  type E2EOAuthConfig,
} from './E2EOAuthHelpers';

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
