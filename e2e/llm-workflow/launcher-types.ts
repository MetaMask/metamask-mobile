import type { Page, BrowserContext } from '@playwright/test';
import type { SessionLaunchInput } from '@metamask/client-mcp-core';

/**
 * Mobile-specific launch options extending SessionLaunchInput
 * Adapts browser-based launch options for iOS simulator environment
 */
export type MobileLaunchOptions = SessionLaunchInput & {
  /** iOS simulator device UDID (e.g., "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX") */
  simulatorDeviceId?: string;
  /** Path to MetaMask Mobile .app bundle (e.g., "/path/to/MetaMask.app") */
  appBundlePath?: string;
  /** Port for Anvil blockchain (default: 8545) */
  anvilPort?: number;
  /** Port for fixture server (default: 12345) */
  fixtureServerPort?: number;
  /** Port of the running Metro bundler — triggers openurl after app launch to connect app to Metro */
  metroPort?: number;
  runnerDerivedDataPath?: string;
};

/**
 * Mobile session configuration
 * Represents the configuration state of a mobile E2E session
 */
export interface MobileSessionConfig {
  /** Unique session identifier */
  sessionId: string;
  /** iOS simulator device UDID */
  simulatorDeviceId: string;
  /** Path to the built .app bundle */
  appBundlePath: string;
  /** Anvil blockchain port */
  anvilPort: number;
  /** Fixture server port */
  fixtureServerPort: number;
  /** Whether the app is currently running */
  isRunning: boolean;
  /** Timestamp when session was created */
  createdAt: Date;
}

/**
 * Mobile app state snapshot
 * Represents the current state of the MetaMask Mobile app
 */
export interface MobileAppState {
  /** Whether the app is loaded and responsive */
  isLoaded: boolean;
  /** Current screen name (e.g., 'unlock', 'home', 'onboarding-welcome') */
  currentScreen: string;
  /** Whether the wallet is unlocked */
  isUnlocked: boolean;
  /** Currently selected account address (null if no account) */
  accountAddress: string | null;
  /** Currently selected network name (null if not set) */
  networkName: string | null;
  /** Currently selected chain ID (null if not set) */
  chainId: number | null;
  /** Native token balance (null if not available) */
  balance: string | null;
  /** Whether the app is in onboarding flow */
  isOnboarding: boolean;
}

/**
 * Mobile app context
 * Contains references to the running app and its state
 */
export interface MobileAppContext {
  /** Playwright BrowserContext for the app */
  context: BrowserContext;
  /** Main app page/screen */
  appPage: Page;
  /** Session configuration */
  config: MobileSessionConfig;
}

/**
 * State mode for wallet initialization
 * - 'default': Pre-onboarded wallet with 25 ETH
 * - 'onboarding': Fresh wallet requiring onboarding
 * - 'custom': Custom fixture state
 */
export type StateMode = 'default' | 'onboarding' | 'custom';

/**
 * Network configuration for Anvil
 */
export interface NetworkConfig {
  /** Network mode: 'localhost' (Anvil), 'fork' (forked mainnet), 'custom' */
  mode?: 'localhost' | 'fork' | 'custom';
  /** Chain ID for the network */
  chainId?: number;
  /** RPC URL for custom networks */
  rpcUrl?: string;
  /** Block number to fork from (for fork mode) */
  forkBlockNumber?: number;
  /** Network name */
  chainName?: string;
  /** Native currency configuration */
  nativeCurrency?: {
    symbol: string;
    decimals: number;
  };
}

/**
 * Fixture data for wallet state
 */
export interface FixtureData {
  /** Fixture state data */
  data: Record<string, unknown>;
  /** Metadata about the fixture */
  meta?: {
    version: number;
  };
}

/**
 * Screenshot options for mobile app
 */
export interface ScreenshotOptions {
  /** Name for the screenshot file */
  name: string;
  /** Whether to capture full page/screen */
  fullPage?: boolean;
  /** CSS selector to capture (if not full page) */
  selector?: string;
  /** Whether to include timestamp in filename */
  timestamp?: boolean;
  /** Page to capture (defaults to app page) */
  page?: Page;
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  /** Path to saved screenshot file */
  path: string;
  /** Base64 encoded image data */
  base64: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
}

/**
 * Mobile app screen names
 */
export type ScreenName =
  | 'unlock'
  | 'home'
  | 'onboarding-welcome'
  | 'onboarding-import'
  | 'onboarding-create'
  | 'onboarding-srp'
  | 'onboarding-password'
  | 'onboarding-complete'
  | 'onboarding-metametrics'
  | 'settings'
  | 'send'
  | 'swap'
  | 'bridge'
  | 'confirm-transaction'
  | 'confirm-signature'
  | 'notification'
  | 'unknown';
