import { defaultGanacheOptions } from '../fixtures/fixture-helper';
import { CustomNetworks } from './networks.e2e';
import { mockEvents } from '../api-mocking/mock-config/mock-events';

const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig;
const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig;

/**
 * Shared mock configuration for all network tests
 */
export const testSpecificMock = {
  GET: [
    mockEvents.GET.suggestedGasFeesApiGanache
  ],
};

/**
 * Mega ETH local Ganache configuration
 */
export const megaEthLocalConfig = {
  ...defaultGanacheOptions,
  chainId: parseInt(MEGAETH_TESTNET.chainId, 16),
  networkId: parseInt(MEGAETH_TESTNET.chainId, 16),
  gasPrice: '0x3b9aca00',
  gasLimit: '0x1c9c380',
};

/**
 * Monad local Ganache configuration
 */
export const monadLocalConfig = {
  ...defaultGanacheOptions,
  chainId: parseInt(MONAD_TESTNET.chainId, 16),
  networkId: parseInt(MONAD_TESTNET.chainId, 16),
  gasPrice: '0x1',
  gasLimit: '0x5f5e100',
};

/**
 * Mega ETH provider configuration
 */
export const megaEthProviderConfig = {
  chainId: '0x539',
  rpcUrl: 'http://localhost:8545',      // Local Ganache
  ticker: MEGAETH_TESTNET.ticker,       // "MegaETH" ticker (for display)
  nickname: `${MEGAETH_TESTNET.nickname} (Local)`, // "Mega Testnet (Local)"
  type: 'custom',
};

/**
 * Monad provider configuration
 */
export const monadProviderConfig = {
  chainId: '0x539',
  rpcUrl: 'http://localhost:8545',      // Local Ganache
  ticker: MONAD_TESTNET.ticker,         // "MON" ticker (for display)
  nickname: `${MONAD_TESTNET.nickname} (Local)`, // "Monad Testnet (Local)"
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
};

/**
 * Complete test configurations that combine all the above
 * Ready-to-use configurations for withFixtures
 */
export const testConfigurations = {
  /**
   * Mega ETH test configuration
   */
  megaEth: {
    ganacheOptions: megaEthLocalConfig,
    providerConfig: megaEthProviderConfig,
    permissions: permissionConfigs.megaEth,
    testSpecificMock,
  },

  /**
   * Monad test configuration
   */
  monad: {
    ganacheOptions: monadLocalConfig,
    providerConfig: monadProviderConfig,
    permissions: permissionConfigs.monad,
    testSpecificMock,
  },
};

/**
 * Test configurations for easy network testing
 * Add new networks here to automatically include them in all tests
 */
export const NETWORK_TEST_CONFIGS = [
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
  // Add new networks here:
  // {
  //   name: 'Polygon',
  //   networkConfig: POLYGON_TESTNET,
  //   ganacheOptions: polygonLocalConfig,
  //   providerConfig: polygonProviderConfig,
  //   permissions: [POLYGON_TESTNET.chainId],
  //   testSpecificMock,
  // },
];
