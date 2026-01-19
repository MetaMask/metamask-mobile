// Gestures

import { LanguageAndLocale } from 'detox/detox';
import { DappVariants } from './Constants';
import { AnvilManager, Hardfork } from '../seeder/anvil-manager';
import ContractAddressRegistry from '../../app/util/test/contract-address-registry';
import Ganache from '../../app/util/test/ganache';
import { Mockttp } from 'mockttp';
import FixtureBuilder from './fixtures/FixtureBuilder';
import CommandQueueServer from './fixtures/CommandQueueServer';

/*
 * WDIO PLAYWRIGHT TESTS
 */
export enum Platform {
  ANDROID = 'android',
  IOS = 'ios',
}

export enum DeviceOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

export interface EmulatorConfig {
  provider: 'emulator';
  name?: string;
  osVersion?: string;
  packageName?: string;
  launchableActivity?: string;
  udid?: string;
  orientation?: DeviceOrientation;
}

export interface BrowserStackConfig {
  provider: 'browserstack';
  name: string;
  osVersion: string;
  orientation?: DeviceOrientation;
  enableCameraImageInjection?: boolean;
}

export type DeviceConfig = EmulatorConfig | BrowserStackConfig;

export interface TimeoutOptions {
  /**
   * The maximum amount of time (in milliseconds) to wait for the condition to be met.
   */
  expectTimeout: number;
}

export interface WebDriverConfig {
  platform: Platform;
  device: DeviceConfig;
  buildPath: string;
  appBundleId: string;
  launchableActivity: string;
  expectTimeout: number;
}
/**
 * END OF WDIO PLAYWRIIGHT
 */

export interface GestureOptions {
  timeout?: number;
  checkStability?: boolean;
  checkVisibility?: boolean;
  checkEnabled?: boolean;
  elemDescription?: string; // For better error messages - i.e "Get Started button"
}

export interface TapOptions extends GestureOptions {
  delay?: number; // Delay before the tap action
  waitForElementToDisappear?: boolean; // If true, waits for the element to disappear after tapping
}

export interface TypeTextOptions extends GestureOptions {
  clearFirst?: boolean;
  hideKeyboard?: boolean;
  sensitive?: boolean; // If true, the text will not be logged in the test report
  delay?: number; // Delay before the type text action
}

export interface SwipeOptions extends GestureOptions {
  speed?: 'fast' | 'slow';
  percentage?: number;
  startOffsetPercentage?: { x: number; y: number };
}

export interface LongPressOptions extends GestureOptions {
  duration?: number;
}

export interface ScrollOptions extends GestureOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  scrollAmount?: number;
  delay?: number;
}

// Assertions

export interface AssertionOptions extends RetryOptions {
  timeout?: number;
  description?: string; // Description for the assertion, e.g. "The Wallet View should be visible"
}

export interface RetryOptions {
  timeout?: number;
  interval?: number;
  description?: string; // Description for the retry operation, e.g. "tap() or "waitForReadyState()"
  elemDescription?: string;
  maxRetries?: number;
}

export interface StabilityOptions {
  timeout?: number;
  interval?: number;
  stableCount?: number;
}
export interface RampsRegion {
  currencies: string[];
  emoji: string;
  id: string;
  name: string;
  support: { buy: boolean; sell: boolean; recurringBuy: boolean };
  unsupported: boolean;
  recommended: boolean;
  detected: boolean;
}

export enum ServerStatus {
  STOPPED = 'stopped',
  STARTED = 'started',
}

/**
 * Interface representing a resource that can be started and stopped.
 * Examples: FixtureServer, MockServer, CommandQueueServer, etc.
 */
export interface Resource {
  stop(): Promise<void>;
  start(): Promise<void>;
  isStarted(): boolean;
  setServerPort(port: number): void;
  getServerPort(): number;
  getServerStatus(): ServerStatus;
  getServerUrl?: string;
}

// Fixtures and Local Node Types
// Available local node types
export enum LocalNodeType {
  anvil = 'anvil',
  ganache = 'ganache',
  bitcoin = 'bitcoin',
}

export enum PerpsModifiersCommandTypes {
  pushPrice = 'push-price',
  forceLiquidation = 'force-liquidation',
  mockDeposit = 'mock-deposit',
}

export type CommandType = PerpsModifiersCommandTypes;

export enum GanacheHardfork {
  london = 'london',
}

export interface LocalNodeConfig {
  type: LocalNodeType;
  options: AnvilNodeOptions | GanacheNodeOptions;
}

export interface GanacheNodeOptions {
  hardfork: GanacheHardfork;
  mnemonic: string;
  [key: string]: unknown; // Allow additional properties of any type
}
export interface AnvilNodeOptions {
  hardfork?: Hardfork;
  forkUrl?: string;
  loadState?: string;
  balance?: number;
  blockTime?: number;
  chainId?: number;
  gasLimit?: number;
  gasPrice?: number;
  host?: string;
  mnemonic?: string;
  port?: number;
  noMining?: boolean;
}

export type LocalNodeOptionsInput = LocalNodeConfig[];

// Fixture Builder types
export interface BackupAndSyncSettings {
  isBackupAndSyncEnabled: boolean;
  isAccountSyncingEnabled: boolean;
  isContactSyncingEnabled: boolean;
}

export interface LaunchArgs {
  fixtureServerPort: string;
  detoxURLBlacklistRegex: string;
  mockServerPort: string;
}

/**
 * The options for the dapp to load for test.
 * @param {DappVariants | string} dappVariant - The variant of the dapp to load.
 * If a string is provided, a dappPath needs to be provided as well.
 * Please consider adding the new dapp to the existing enum.
 * @example
 * {
 *  dappVariant: DappVariants.TEST_DAPP,
 * }
 * // or
 * @example
 * {
 *  dappVariant: 'https://example.com',
 *  dappPath: 'PATH_TO_DAPP',
 * }
 * @param {string} [dappPath] - The path to the dapp to load.
 */
export interface DappOptions {
  dappVariant: DappVariants | string;
  dappPath?: string;
}

export type TestSuiteFunction = (params: TestSuiteParams) => Promise<void>;

export type LocalNode = AnvilManager | Ganache;

export interface TestSuiteParams {
  contractRegistry?: ContractAddressRegistry;
  mockServer: Mockttp;
  localNodes?: LocalNode[];
  commandQueueServer?: CommandQueueServer;
}

/**
 * ONLY TO BE USED BY DEFAULT MOCKS
 *
 * If you are using individual mocks for specific tests
 * Use the `testSpecificMock` function instead for improved mock management and type safety.
 *
 * Interface representing a collection of mock API endpoints grouped by HTTP methods.
 * Each property corresponds to an HTTP method (GET, POST, PUT, etc.) and contains
 * an array of mock endpoints for that method.
 *
 * @example
 * ```typescript
 * // Deprecated usage - avoid this pattern
 * const mocks: MockObject = {
 *   GET: [{ url: '/api/users', response: { users: [] } }],
 *   POST: [{ url: '/api/users', response: { id: 1 } }]
 * };
 *
 * // Preferred approach - use testSpecificMock instead
 * testSpecificMock(mockServer) {
 *   mockServer.forGet('/api/users').thenReply(200, JSON.stringify({ users: [] }));
 *   mockServer.forPost('/api/users').thenReply(200, JSON.stringify({ id: 1 }));
 * };
 * ```
 */
export interface MockEventsObject {
  GET?: MockApiEndpoint[];
  POST?: MockApiEndpoint[];
  PUT?: MockApiEndpoint[];
  [key: string]: MockApiEndpoint[] | undefined;
}

export interface MockApiEndpoint {
  urlEndpoint: string | RegExp;
  requestBody?: unknown;
  ignoreFields?: string[];
  response: unknown;
  responseCode: number;
  priority?: number;
}

export type TestSpecificMock = (mockServer: Mockttp) => Promise<void>;

/**
 * The options for the withFixtures function.
 * @param {FixtureBuilder | ((ctx: { localNodes?: LocalNode[] }) => FixtureBuilder | Promise<FixtureBuilder>)} fixture - The state of the fixture to load or a function that returns a fixture builder.
 * @param {boolean} [restartDevice=false] - If true, restarts the app to apply the loaded fixture.
 * @param {string[]} [smartContracts] - The smart contracts to load for test. These will be deployed on the different {localNodeOptions}
 * @param {LocalNodeOptionsInput} [localNodeOptions] - The local node options to use for the test.
 * @param {boolean} [disableLocalNodes=false] - If true, disables the local nodes.
 * @param {DappOptions[]} [dapps] - The dapps to load for test. The base static port is defined and all dapps from dapp[1] will have the port incremented by 1.
 * @param {Record<string, unknown>} [testSpecificMock] - The test specific mock function to use for the test.
 * @param {Partial<LaunchArgs>} [launchArgs] - The launch arguments to use for the test.
 * @param {LanguageAndLocale} [languageAndLocale] - The language and locale to use for the test.
 * @param {Record<string, unknown>} [permissions] - The permissions to set for the device.
 * @param {() => Promise<void>} [endTestfn] - The function to execute after the test is finished.
 */
export interface WithFixturesOptions {
  fixture:
    | FixtureBuilder
    | ((ctx: {
        localNodes?: LocalNode[];
      }) => FixtureBuilder | Promise<FixtureBuilder>);
  restartDevice?: boolean;
  smartContracts?: string[];
  disableLocalNodes?: boolean;
  dapps?: DappOptions[];
  localNodeOptions?: LocalNodeOptionsInput;
  testSpecificMock?: TestSpecificMock;
  launchArgs?: Partial<LaunchArgs>;
  languageAndLocale?: LanguageAndLocale;
  permissions?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endTestfn?: (...args: any[]) => Promise<void>;
  /**
   * Skip reloading React Native during cleanup to preserve app state between tests.
   * Use this when tests need to maintain state across multiple `it` blocks.
   * @default false
   */
  skipReactNativeReload?: boolean;
  useCommandQueueServer?: boolean;
}
