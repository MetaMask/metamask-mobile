import { BaseController } from '@metamask/base-controller';
import {
  getDefaultSeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';

// Test mnemonic - same as used in other E2E fixtures
const E2E_TEST_MNEMONIC =
  'drive manage close raven tape average sausage pledge riot furnace august tip';

/**
 * Mock state for tracking controller operations
 */
interface MockState {
  isAuthenticated: boolean;
  isNewUser: boolean;
  password: string | null;
  seedPhrase: Uint8Array | null;
  vault: string | null;
  accessToken: string | null;
  socialLoginEmail: string | null;
}

const mockState: MockState = {
  isAuthenticated: false,
  isNewUser: true,
  password: null,
  seedPhrase: null,
  vault: null,
  accessToken: null,
  socialLoginEmail: null,
};

/**
 * Reset mock state between tests
 */
export const resetMockState = () => {
  mockState.isAuthenticated = false;
  mockState.isNewUser = true;
  mockState.password = null;
  mockState.seedPhrase = null;
  mockState.vault = null;
  mockState.accessToken = null;
  mockState.socialLoginEmail = null;
};

/**
 * Configure mock for existing user scenario
 */
export const configureMockForExistingUser = () => {
  mockState.isNewUser = false;
};

/**
 * Configure mock for new user scenario
 */
export const configureMockForNewUser = () => {
  mockState.isNewUser = true;
};

// Controller name for BaseController
const controllerName = 'SeedlessOnboardingController';

/**
 * Generate state metadata dynamically from default state
 * All properties are persisted and not anonymized
 */
const generateStateMetadata = (
  state: SeedlessOnboardingControllerState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata: any = {};
  for (const key of Object.keys(state)) {
    metadata[key] = { persist: true, anonymous: false };
  }
  return metadata;
};

/**
 * Mock SeedlessOnboardingController class
 */
export class MockSeedlessOnboardingController extends BaseController<
  typeof controllerName,
  SeedlessOnboardingControllerState,
  SeedlessOnboardingControllerMessenger
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(options: any) {
    const initialState =
      options.state || getDefaultSeedlessOnboardingControllerState();
    const stateMetadata = generateStateMetadata(initialState);

    super({
      name: controllerName,
      metadata: stateMetadata,
      messenger: options.messenger,
      state: initialState,
    });

    console.log('[E2E Mock] MockSeedlessOnboardingController initialized');
  }

  /**
   * Mock authenticate
   */
  async authenticate(params: {
    idTokens: string[];
    authConnection: string;
    authConnectionId: string;
    groupedAuthConnectionId?: string;
    userId: string;
    socialLoginEmail?: string;
    refreshToken: string;
    revokeToken: string;
    accessToken: string;
    metadataAccessToken?: string;
  }): Promise<{ isNewUser: boolean }> {
    console.log('[E2E Mock] authenticate called with:', {
      userId: params.userId,
      authConnection: params.authConnection,
      socialLoginEmail: params.socialLoginEmail,
    });

    mockState.isAuthenticated = true;
    mockState.accessToken = params.accessToken;
    mockState.socialLoginEmail = params.socialLoginEmail || null;

    // Determine isNewUser based on email pattern
    const email = params.socialLoginEmail || params.userId || '';
    if (email.includes('existinguser')) {
      mockState.isNewUser = false;
    } else if (email.includes('newuser')) {
      mockState.isNewUser = true;
    }

    this.update((state) => {
      state.accessToken = params.accessToken;
    });

    console.log(
      '[E2E Mock] authenticate returning isNewUser:',
      mockState.isNewUser,
    );
    console.log(
      `[E2E Mock] Email pattern detection: "${email}" → isNewUser: ${mockState.isNewUser}`,
    );

    return {
      isNewUser: mockState.isNewUser,
    };
  }

  /**
   * Mock createToprfKeyAndBackupSeedPhrase
   */
  async createToprfKeyAndBackupSeedPhrase(
    password: string,
    seedPhrase: Uint8Array,
    keyringId?: string,
  ): Promise<void> {
    console.log('[E2E Mock] createToprfKeyAndBackupSeedPhrase called');
    console.log(`[E2E Mock] keyringId: ${keyringId}`);

    mockState.password = password;
    mockState.seedPhrase = seedPhrase;
    mockState.vault = 'mock-vault-data';

    // Update controller state using BaseController's update() method
    this.update((state) => {
      state.vault = 'mock-vault-data';
    });

    console.log(
      '[E2E Mock] createToprfKeyAndBackupSeedPhrase completed - seed phrase backup simulated',
    );
  }

  /**
   * Mock submitPassword - used during unlock
   */
  async submitPassword(password: string): Promise<void> {
    console.log('[E2E Mock] submitPassword called');
    mockState.password = password;
  }

  /**
   * Mock setLocked
   */
  async setLocked(): Promise<void> {
    console.log('[E2E Mock] setLocked called');
  }

  /**
   * Mock clearState
   */
  clearState(): void {
    console.log('[E2E Mock] clearState called');
    resetMockState();
    const defaultState = getDefaultSeedlessOnboardingControllerState();
    this.update(() => defaultState);
  }

  /**
   * Mock fetchAllSecretData - returns the stored seed phrase
   */
  async fetchAllSecretData(
    _password?: string,
  ): Promise<{ data: Uint8Array; type: string }[]> {
    console.log('[E2E Mock] fetchAllSecretData called');

    if (mockState.seedPhrase) {
      return [
        {
          data: mockState.seedPhrase,
          type: 'mnemonic',
        },
      ];
    }

    // Return test mnemonic if no seed phrase stored
    const encoder = new TextEncoder();
    return [
      {
        data: encoder.encode(E2E_TEST_MNEMONIC),
        type: 'mnemonic',
      },
    ];
  }

  /**
   * Mock getSecretDataBackupState
   */
  getSecretDataBackupState(_data: Uint8Array, _type: string): string | null {
    console.log('[E2E Mock] getSecretDataBackupState called');
    return null;
  }

  /**
   * Mock updateBackupMetadataState
   */
  updateBackupMetadataState(_params: {
    keyringId: string;
    data: Uint8Array;
    type?: string;
  }): void {
    console.log('[E2E Mock] updateBackupMetadataState called');
  }

  /**
   * Mock addNewSecretData
   */
  async addNewSecretData(
    _data: Uint8Array,
    _type: string,
    _options?: { keyringId: string },
  ): Promise<void> {
    console.log('[E2E Mock] addNewSecretData called');
  }

  /**
   * Mock renewRefreshToken
   */
  async renewRefreshToken(_password: string): Promise<void> {
    console.log('[E2E Mock] renewRefreshToken called');
  }

  /**
   * Mock revokePendingRefreshTokens
   */
  async revokePendingRefreshTokens(): Promise<void> {
    console.log('[E2E Mock] revokePendingRefreshTokens called');
  }

  /**
   * Mock checkIsPasswordOutdated
   */
  async checkIsPasswordOutdated(_options?: {
    skipCache?: boolean;
  }): Promise<boolean> {
    console.log('[E2E Mock] checkIsPasswordOutdated called');
    return false;
  }

  /**
   * Mock submitGlobalPassword
   */
  async submitGlobalPassword(_params: {
    globalPassword: string;
    maxKeyChainLength?: number;
  }): Promise<{ success: boolean; error?: Error }> {
    console.log('[E2E Mock] submitGlobalPassword called');
    return { success: true };
  }

  /**
   * Mock syncLatestGlobalPassword
   */
  async syncLatestGlobalPassword(_params: {
    globalPassword: string;
  }): Promise<void> {
    console.log('[E2E Mock] syncLatestGlobalPassword called');
  }

  /**
   * Mock loadKeyringEncryptionKey
   */
  async loadKeyringEncryptionKey(): Promise<string> {
    console.log('[E2E Mock] loadKeyringEncryptionKey called');
    return 'mock-encryption-key';
  }

  /**
   * Mock storeKeyringEncryptionKey
   */
  async storeKeyringEncryptionKey(_key: string): Promise<void> {
    console.log('[E2E Mock] storeKeyringEncryptionKey called');
  }

  /**
   * Mock refreshAuthTokens
   */
  async refreshAuthTokens(): Promise<void> {
    console.log('[E2E Mock] refreshAuthTokens called');
  }
}

// Export helpers for E2E test configuration
export const E2EMockSeedlessHelpers = {
  reset: resetMockState,
  configureNewUser: configureMockForNewUser,
  configureExistingUser: configureMockForExistingUser,
  getMockState: () => ({ ...mockState }),
};
