/* eslint-disable @typescript-eslint/no-explicit-any */
import { defaultGanacheOptions } from '../framework/Constants.ts';
import { CustomNetworks } from './networks.e2e';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../api-mocking/helpers/remoteFeatureFlagsHelper.ts';
import {
  confirmationsRedesignedFeatureFlags,
  oldConfirmationsRemoteFeatureFlags,
} from '../api-mocking/mock-responses/feature-flags-mocks.ts';

const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig;
const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig;
const SEI_TESTNET = CustomNetworks.SeiTestNet.providerConfig;

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  chainId: string;
  rpcUrl: string;
  ticker: string;
  nickname: string;
  type: string;
}

/**
 * Ganache configuration interface
 */
export interface GanacheConfig {
  chainId: number;
  networkId: number;
  gasPrice: string;
  gasLimit: string;
  [key: string]: any;
}

/**
 * Test configuration interface
 */
export interface TestConfiguration {
  ganacheOptions: GanacheConfig;
  providerConfig: ProviderConfig;
  permissions: string[];
  testSpecificMock: (mockServer: Mockttp) => Promise<void>;
}

/**
 * Network test configuration interface
 */
export interface NetworkTestConfig {
  name: string;
  networkConfig: any;
  ganacheOptions: GanacheConfig;
  providerConfig: ProviderConfig;
  permissions: string[];
  testSpecificMock: (mockServer: Mockttp) => Promise<void>;
}

/**
 * Shared mock configuration for all network tests using redesigned patterns
 */
export const testSpecificMock = async (mockServer: Mockttp): Promise<void> => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
  );
};

/**
 * Redesigned confirmations mock configuration
 */
export const redesignedTestSpecificMock = async (
  mockServer: Mockttp,
): Promise<void> => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...confirmationsRedesignedFeatureFlags),
  );
};

/**
 * Mega ETH local Ganache configuration
 */
export const megaEthLocalConfig: GanacheConfig = {
  ...defaultGanacheOptions,
  chainId: parseInt(MEGAETH_TESTNET.chainId, 16),
  networkId: parseInt(MEGAETH_TESTNET.chainId, 16),
  gasPrice: '0x3b9aca00',
  gasLimit: '0x1c9c380',
};

/**
 * Monad local Ganache configuration
 */
export const monadLocalConfig: GanacheConfig = {
  ...defaultGanacheOptions,
  chainId: parseInt(MONAD_TESTNET.chainId, 16),
  networkId: parseInt(MONAD_TESTNET.chainId, 16),
  gasPrice: '0x1',
  gasLimit: '0x5f5e100',
};

/**
 * Sei local Ganache configuration
 */
export const seiLocalConfig: GanacheConfig = {
  ...defaultGanacheOptions,
  chainId: parseInt(SEI_TESTNET.chainId, 16),
  networkId: parseInt(SEI_TESTNET.chainId, 16),
  gasPrice: '0x1',
  gasLimit: '0x5f5e100',
};

/**
 * Mega ETH provider configuration
 */
export const megaEthProviderConfig: ProviderConfig = {
  chainId: '0x539',
  rpcUrl: 'http://localhost:8545', // Local Ganache
  ticker: MEGAETH_TESTNET.ticker, // "MegaETH" ticker (for display)
  nickname: `${MEGAETH_TESTNET.nickname}`, // "Mega Testnet (Local)"
  type: 'custom',
};

/**
 * Monad provider configuration
 */
export const monadProviderConfig: ProviderConfig = {
  chainId: '0x539',
  rpcUrl: 'http://localhost:8545', // Local Ganache
  ticker: MONAD_TESTNET.ticker, // "MON" ticker (for display)
  nickname: `${MONAD_TESTNET.nickname}`, // "Monad Testnet (Local)"
  type: 'custom',
};

/**
 * Sei provider configuration
 */
export const seiProviderConfig: ProviderConfig = {
  chainId: '0x539',
  rpcUrl: 'http://localhost:8545', // Local Ganache
  ticker: SEI_TESTNET.ticker, // "SEI" ticker (for display)
  nickname: `${SEI_TESTNET.nickname}`, // "Sei Testnet (Local)"
  type: 'custom',
};

/**
 * Permission configurations for different networks
 */
export const permissionConfigs = {
  /**
   * Ganache permissions (for local testing)
   */
  ganache: ['0x539'],

  /**
   * Real network permissions (if needed for future authentic testing)
   */
  megaEth: [MEGAETH_TESTNET.chainId],
  monad: [MONAD_TESTNET.chainId],
  sei: [SEI_TESTNET.chainId],
} as const;

/**
 * Complete test configurations that combine all the above
 * Ready-to-use configurations for withFixtures
 */
export const testConfigurations: Record<string, TestConfiguration> = {
  /**
   * Mega ETH test configuration
   */
  megaEth: {
    ganacheOptions: megaEthLocalConfig,
    providerConfig: megaEthProviderConfig,
    permissions: [...permissionConfigs.megaEth],
    testSpecificMock,
  },

  /**
   * Monad test configuration
   */
  monad: {
    ganacheOptions: monadLocalConfig,
    providerConfig: monadProviderConfig,
    permissions: [...permissionConfigs.monad],
    testSpecificMock,
  },

  /**
   * Sei test configuration
   */
  sei: {
    ganacheOptions: seiLocalConfig,
    providerConfig: seiProviderConfig,
    permissions: [...permissionConfigs.sei],
    testSpecificMock,
  },
};

/**
 * Redesigned test configurations using new mock patterns
 */
export const redesignedTestConfigurations: Record<string, TestConfiguration> = {
  /**
   * Mega ETH test configuration with redesigned mocks
   */
  megaEth: {
    ganacheOptions: megaEthLocalConfig,
    providerConfig: megaEthProviderConfig,
    permissions: [...permissionConfigs.megaEth],
    testSpecificMock: redesignedTestSpecificMock,
  },

  /**
   * Monad test configuration with redesigned mocks
   */
  monad: {
    ganacheOptions: monadLocalConfig,
    providerConfig: monadProviderConfig,
    permissions: [...permissionConfigs.monad],
    testSpecificMock: redesignedTestSpecificMock,
  },

  /**
   * Sei test configuration with redesigned mocks
   */
  sei: {
    ganacheOptions: seiLocalConfig,
    providerConfig: seiProviderConfig,
    permissions: [...permissionConfigs.sei],
    testSpecificMock: redesignedTestSpecificMock,
  },
};

/**
 * Test configurations for easy network testing
 * Add new networks here to automatically include them in all tests
 */
export const NETWORK_TEST_CONFIGS: NetworkTestConfig[] = [
  {
    name: 'MegaETH',
    networkConfig: MEGAETH_TESTNET,
    ganacheOptions: megaEthLocalConfig,
    providerConfig: megaEthProviderConfig,
    permissions: [MEGAETH_TESTNET.chainId],
    testSpecificMock,
  },
  {
    name: 'Monad',
    networkConfig: MONAD_TESTNET,
    ganacheOptions: monadLocalConfig,
    providerConfig: monadProviderConfig,
    permissions: [MONAD_TESTNET.chainId],
    testSpecificMock,
  },
  {
    name: 'Sei',
    networkConfig: SEI_TESTNET,
    ganacheOptions: seiLocalConfig,
    providerConfig: seiProviderConfig,
    permissions: [SEI_TESTNET.chainId],
    testSpecificMock,
  },
];

/**
 * Redesigned network test configurations using new mock patterns
 */
export const REDESIGNED_NETWORK_TEST_CONFIGS: NetworkTestConfig[] = [
  {
    name: 'MegaETH',
    networkConfig: MEGAETH_TESTNET,
    ganacheOptions: megaEthLocalConfig,
    providerConfig: megaEthProviderConfig,
    permissions: [MEGAETH_TESTNET.chainId],
    testSpecificMock: redesignedTestSpecificMock,
  },
  {
    name: 'Monad',
    networkConfig: MONAD_TESTNET,
    ganacheOptions: monadLocalConfig,
    providerConfig: monadProviderConfig,
    permissions: [MONAD_TESTNET.chainId],
    testSpecificMock: redesignedTestSpecificMock,
  },
  {
    name: 'Sei',
    networkConfig: SEI_TESTNET,
    ganacheOptions: seiLocalConfig,
    providerConfig: seiProviderConfig,
    permissions: [SEI_TESTNET.chainId],
    testSpecificMock: redesignedTestSpecificMock,
  },
];
