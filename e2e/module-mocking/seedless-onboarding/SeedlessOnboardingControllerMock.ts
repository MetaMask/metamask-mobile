/**
 * Mock SeedlessOnboardingController for E2E testing
 *
 * This mock is needed because:
 * 1. The OAuth module mock bypasses SeedlessOnboardingController.authenticate()
 * 2. Without authentication, createToprfKeyAndBackupSeedPhrase() and fetchAllSecretData() fail
 *
 * This mock provides:
 * - Mock authenticate() that sets up controller state
 * - Mock createToprfKeyAndBackupSeedPhrase() that returns success
 * - Mock fetchAllSecretData() that returns mock SRP for existing users
 *
 * IMPORTANT: This is a temporary solution for client-side-only mocking.
 * For production E2E tests, use backend QA mock endpoints with real TOPRF authentication.
 */

// Import types from the real controller
import type { SeedlessOnboardingControllerState } from '@metamask/seedless-onboarding-controller';

/**
 * E2E Test SRP
 * This SRP is returned for existing user rehydration tests
 */
const E2E_SRP =
  'spread raise short crane omit tent fringe mandate neglect detail suspect cradle';

/**
 * Convert SRP string to Uint8Array for fetchAllSecretData response
 */
function srpToUint8Array(srp: string): Uint8Array {
  return new Uint8Array(Buffer.from(srp));
}

/**
 * Mock configuration
 */
interface MockConfig {
  isNewUser: boolean;
  email: string;
  srp: string;
}

let mockConfig: MockConfig = {
  isNewUser: true,
  email: 'google.newuser+e2e@web3auth.io',
  srp: E2E_SRP,
};

/**
 * E2E Helpers for configuring the mock
 */
export const E2ESeedlessControllerHelpers = {
  configureNewUser: (email = 'google.newuser+e2e@web3auth.io'): void => {
    mockConfig = { isNewUser: true, email, srp: E2E_SRP };
  },

  configureExistingUser: (
    email = 'google.existinguser+e2e@web3auth.io',
    srp = E2E_SRP,
  ): void => {
    mockConfig = { isNewUser: false, email, srp };
  },

  reset: (): void => {
    mockConfig = { isNewUser: true, email: 'google.newuser+e2e@web3auth.io', srp: E2E_SRP };
  },

  getConfig: (): MockConfig => ({ ...mockConfig }),
};

/**
 * Mock SeedlessOnboardingController
 * Implements the essential methods needed for E2E tests
 */
export class MockSeedlessOnboardingController {
  state: Partial<SeedlessOnboardingControllerState> = {
    vault: undefined,
    nodeAuthTokens: undefined,
  };

  private isAuthenticated = false;

  /**
   * Mock authenticate - sets up controller state without real TOPRF calls
   */
  authenticate = async (_params: {
    idTokens: string[];
    authConnection: string;
    authConnectionId: string;
    groupedAuthConnectionId: string;
    userId: string;
    socialLoginEmail: string;
    refreshToken: string;
    revokeToken: string;
    accessToken: string;
    metadataAccessToken: string;
  }): Promise<{ isNewUser: boolean }> => {
    // Simulate authentication success
    this.isAuthenticated = true;

    // Set up mock state as if TOPRF authentication succeeded
    this.state = {
      ...this.state,
      nodeAuthTokens: {
        // Mock node auth tokens (not cryptographically valid but sufficient for E2E)
        1: 'mock-auth-token-node-1',
        2: 'mock-auth-token-node-2',
        3: 'mock-auth-token-node-3',
        4: 'mock-auth-token-node-4',
        5: 'mock-auth-token-node-5',
      } as unknown as SeedlessOnboardingControllerState['nodeAuthTokens'],
    };

    return { isNewUser: mockConfig.isNewUser };
  };

  /**
   * Mock createToprfKeyAndBackupSeedPhrase - simulates successful backup
   */
  createToprfKeyAndBackupSeedPhrase = async (
    _seedPhrase: Uint8Array,
    _password: string,
  ): Promise<void> => {
    if (!this.isAuthenticated) {
      throw new Error('SeedlessOnboardingController: Not authenticated');
    }

    // Simulate successful backup
    this.state = {
      ...this.state,
      vault: 'mock-encrypted-vault-data-for-e2e',
    };

    return Promise.resolve();
  };

  /**
   * Mock fetchAllSecretData - returns mock SRP for existing users
   */
  fetchAllSecretData = async (
    _password: string,
  ): Promise<Array<{ data: Uint8Array; type: string }>> => {
    if (!this.isAuthenticated) {
      throw new Error('SeedlessOnboardingController: Not authenticated');
    }

    if (mockConfig.isNewUser) {
      // New users have no backup
      return [];
    }

    // Existing users get their SRP
    return [
      {
        data: srpToUint8Array(mockConfig.srp),
        type: 'mnemonic',
      },
    ];
  };

  /**
   * Mock submitPassword
   */
  submitPassword = async (_password: string): Promise<void> => {
    return Promise.resolve();
  };

  /**
   * Mock clearState
   */
  clearState = (): void => {
    this.state = {
      vault: undefined,
      nodeAuthTokens: undefined,
    };
    this.isAuthenticated = false;
  };

  /**
   * Mock updateBackupMetadataState
   */
  updateBackupMetadataState = async (_params: {
    data: Uint8Array;
    keyringId: string;
    type: string;
  }): Promise<void> => {
    return Promise.resolve();
  };

  /**
   * Mock setLocked
   */
  setLocked = async (): Promise<void> => {
    return Promise.resolve();
  };

  /**
   * Mock exportEncryptionKey
   */
  exportEncryptionKey = async (): Promise<unknown> => {
    return { key: 'mock-encryption-key' };
  };

  /**
   * Mock storeKeyringEncryptionKey
   */
  storeKeyringEncryptionKey = async (): Promise<void> => {
    return Promise.resolve();
  };

  /**
   * Mock getSecretDataBackupState
   */
  getSecretDataBackupState = (): null => {
    return null;
  };
}

// Export singleton for module aliasing
const mockController = new MockSeedlessOnboardingController();
export default mockController;
