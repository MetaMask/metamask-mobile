import {
  getPlatformDriver,
  type StateSnapshotCapability,
  type StateSnapshot,
  type StateOptions,
  type ScreenName,
} from '@metamask/client-mcp-core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageType = any; // Playwright Page type (unused on iOS)

/**
 * Screen detection map: Maps testIds to screen names.
 * This is a data-driven approach to identify which screen the app is on.
 */
const SCREEN_DETECTION_MAP = new Map<string, ScreenName>([
  // Login/Unlock
  ['login', 'unlock'],
  ['login-with-biometric-switch', 'unlock'],
  ['login-password-input', 'unlock'],

  // Onboarding
  ['onboarding-screen', 'onboarding-welcome'],
  ['wallet-setup-screen-create-new-wallet-button-id', 'onboarding-welcome'],

  // Wallet/Home
  ['wallet-screen', 'home'],
  ['tab-bar-item-Wallet', 'home'],
  ['account-overview', 'home'],

  // Settings
  ['settings-scroll', 'settings'],
  ['settings-header', 'settings'],
]);

/**
 * MetaMask Mobile State Snapshot Capability
 *
 * Implements StateSnapshotCapability for mobile app state detection.
 * Uses IOSPlatformDriver to fetch app state and accessibility tree.
 *
 * IMPORTANT: The Page parameter is Playwright-typed and does NOT apply to iOS.
 * - Accept Page in type signature (TypeScript requires it for interface conformance)
 * - IGNORE the page parameter entirely — it will be undefined on iOS
 * - Use getPlatformDriver() to get the active IOSPlatformDriver
 */
export class MetaMaskMobileStateSnapshotCapability
  implements StateSnapshotCapability
{
  /**
   * Get the current app state.
   *
   * @param _page - Playwright Page (IGNORED on iOS, will be undefined)
   * @param _options - State options (unused for mobile)
   * @returns Promise resolving to app state snapshot
   */
  async getState(
    _page: PageType,
    _options: StateOptions,
  ): Promise<StateSnapshot> {
    const platformDriver = getPlatformDriver();

    if (!platformDriver) {
      return {
        isLoaded: false,
        currentUrl: '',
        extensionId: '',
        isUnlocked: false,
        currentScreen: 'unknown',
        accountAddress: null,
        networkName: null,
        chainId: null,
        balance: null,
      };
    }

    const appState = await platformDriver.getAppState();
    const currentScreen = await this.detectCurrentScreen(_page);

    return {
      ...appState,
      currentScreen,
    };
  }

  /**
   * Detect the current screen based on accessibility tree testIds.
   *
   * @param _page - Playwright Page (IGNORED on iOS, will be undefined)
   * @returns Promise resolving to screen name
   */
  async detectCurrentScreen(_page: PageType): Promise<ScreenName> {
    const platformDriver = getPlatformDriver();

    if (!platformDriver) {
      return 'unknown';
    }

    try {
      const testIds = await platformDriver.getTestIds();

      for (const item of testIds) {
        const screenName = SCREEN_DETECTION_MAP.get(item.testId);
        if (screenName) {
          return screenName;
        }
      }

      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
}
