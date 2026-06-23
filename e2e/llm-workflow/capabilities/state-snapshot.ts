import type {
  IPlatformDriver,
  ScreenName,
  StateOptions,
  StateSnapshot,
  StateSnapshotCapability,
} from '@metamask/client-mcp-core';
import type { Page } from '@playwright/test';

const SCREEN_DETECTION_MAP = new Map<string, ScreenName>([
  ['login', 'unlock'],
  ['login-with-biometric-switch', 'unlock'],
  ['login-password-input', 'unlock'],
  ['onboarding-screen', 'onboarding-welcome'],
  ['wallet-setup-screen-create-new-wallet-button-id', 'onboarding-welcome'],
  ['wallet-screen', 'home'],
  ['tab-bar-item-Wallet', 'home'],
  ['account-overview', 'home'],
  ['settings-scroll', 'settings'],
  ['settings-header', 'settings'],
]);

export interface StateSnapshotCapabilityOptions {
  /** Resolver returning the current iOS platform driver (may be undefined if no session). */
  getPlatformDriver: () => IPlatformDriver | undefined;
}

export class MetaMaskMobileStateSnapshotCapability
  implements StateSnapshotCapability
{
  private readonly getPlatformDriver: () => IPlatformDriver | undefined;

  constructor(options: StateSnapshotCapabilityOptions) {
    this.getPlatformDriver = options.getPlatformDriver;
  }

  async getState(_page: Page, _options: StateOptions): Promise<StateSnapshot> {
    const platformDriver = this.getPlatformDriver();
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
    return { ...appState, currentScreen };
  }

  async detectCurrentScreen(_page: Page): Promise<string> {
    const platformDriver = this.getPlatformDriver();
    if (!platformDriver) {
      return 'unknown';
    }
    try {
      const testIds = await platformDriver.getTestIds();
      for (const item of testIds) {
        const screen = SCREEN_DETECTION_MAP.get(item.testId);
        if (screen) {
          return screen;
        }
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
