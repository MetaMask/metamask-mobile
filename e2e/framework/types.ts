// Gestures

import { LanguageAndLocale } from 'detox/detox';
import { DappVariants } from './Constants';
import { AnvilManager, Hardfork } from '../seeder/anvil-manager';
import ContractAddressRegistry from '../../app/util/test/contract-address-registry';
import Ganache from '../../app/util/test/ganache';
import { Mockttp } from 'mockttp';
import FixtureBuilder from './fixtures/FixtureBuilder';

export interface GestureOptions {
  timeout?: number;
  checkStability?: boolean;
  checkVisibility?: boolean;
  checkEnabled?: boolean;
  elemDescription?: string; // For better error messages - i.e "Get Started button"
}

export interface TapOptions extends GestureOptions {
  delay?: number; // Delay before the tap action
}

export interface TypeTextOptions extends GestureOptions {
  clearFirst?: boolean;
  hideKeyboard?: boolean;
  sensitive?: boolean; // If true, the text will not be logged in the test report
}

export interface SwipeOptions extends GestureOptions {
  speed?: 'fast' | 'slow';
  percentage?: number;
}

export interface LongPressOptions extends GestureOptions {
  duration?: number;
}

export interface ScrollOptions extends GestureOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  scrollAmount?: number;
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

// Fixtures and Local Node Types

// Available local node types
export enum LocalNodeType {
  anvil = 'anvil',
  ganache = 'ganache',
  bitcoin = 'bitcoin',
}

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
  mockServer?: Mockttp;
  localNodes?: LocalNode[];
}

export interface TestSpecificMock {
  GET?: MockApiEndpoint[];
  POST?: MockApiEndpoint[];
  PUT?: MockApiEndpoint[];
  [key: string]: MockApiEndpoint[] | undefined;
}

export interface MockApiEndpoint {
  urlEndpoint: string;
  response: unknown;
  responseCode: number;
}

/**
 * The options for the withFixtures function.
 * @param {FixtureBuilder} fixture - The state of the fixture to load.
 * @param {boolean} [restartDevice=false] - If true, restarts the app to apply the loaded fixture.
 * @param {string[]} [smartContracts] - The smart contracts to load for test. These will be deployed on the different {localNodeOptions}
 * @param {LocalNodeOptionsInput} [localNodeOptions] - The local node options to use for the test.
 * @param {boolean} [disableLocalNodes=false] - If true, disables the local nodes.
 * @param {DappOptions[]} [dapps] - The dapps to load for test. The base static port is defined and all dapps from dapp[1] will have the port incremented by 1.
 * @param {Record<string, unknown>} [testSpecificMock] - The test specific mock to load for test. This needs to be properly typed once we convert api-mocking.js to ts
 * @param {Partial<LaunchArgs>} [launchArgs] - The launch arguments to use for the test.
 * @param {LanguageAndLocale} [languageAndLocale] - The language and locale to use for the test.
 * @param {Record<string, unknown>} [permissions] - The permissions to set for the device.
 * @param {Mockttp} [mockServerInstance] - The mock server instance to use for the test. Useful when a custom setup of the mock server is needed.
 * @param {() => Promise<void>} [endTestfn] - The function to execute after the test is finished.
 */
export interface WithFixturesOptions {
  fixture: FixtureBuilder;
  restartDevice?: boolean;
  smartContracts?: string[];
  disableLocalNodes?: boolean;
  dapps?: DappOptions[];
  localNodeOptions?: LocalNodeOptionsInput;
  testSpecificMock?: TestSpecificMock;
  launchArgs?: Partial<LaunchArgs>;
  languageAndLocale?: LanguageAndLocale;
  permissions?: Record<string, unknown>;
  mockServerInstance?: Mockttp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endTestfn?: (...args: any[]) => Promise<void>;
}
