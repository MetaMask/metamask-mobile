/**
 * Component view test mocks:
 * - ONLY Engine (business) and minimal native mocks.
 */

// Engine mock (singleton default export)
jest.mock('../../../core/Engine', () => {
  const engine = {
    context: {
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
      AccountTrackerController: {
        refresh() {
          return undefined;
        },
      },
      GasFeeController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      PreferencesController: {
        setTokenNetworkFilter() {
          return undefined;
        },
      },
      TokensController: {
        addTokens() {
          return undefined;
        },
      },
      NftDetectionController: {
        detectNfts() {
          return undefined;
        },
      },
      CurrencyRateController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenRatesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenListController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenBalancesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenDetectionController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      MultichainNetworkController: {
        async setActiveNetwork() {
          return undefined;
        },
      },
      NetworkEnablementController: {
        enableNetworkInNamespace() {
          return undefined;
        },
      },
      MultichainAssetsRatesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      NetworkController: {
        state: { networksMetadata: {} },
        findNetworkClientIdByChainId() {
          return '';
        },
        getNetworkConfigurationByNetworkClientId() {
          return null;
        },
        // Is this a valid option?
        getNetworkClientById(id: string) {
          const twoEthHex = '0x1bc16d674ec80000';
          const hundredEthHex = '0x56BC75E2D63100000';
          const pad32 = (hex: string) => {
            const v = hex.startsWith('0x') ? hex.slice(2) : hex;
            return `0x${v.padStart(64, '0')}`;
          };
          const provider = {
            request: jest.fn(
              async (args: { method: string; params?: unknown[] }) => {
                if (args?.method === 'eth_chainId') return '0x1';
                if (args?.method === 'net_version') return '1';
                if (args?.method === 'eth_blockNumber') return '0xabcdef';
                if (args?.method === 'eth_getBalance') {
                  return hundredEthHex;
                }
                if (args?.method === 'eth_call') {
                  return pad32(twoEthHex);
                }
                return null;
              },
            ),
            on: jest.fn(),
            removeListener: jest.fn(),
          };
          return { id, provider };
        },
      },
    },
    controllerMessenger: {
      subscribe() {
        return undefined;
      },
      unsubscribe() {
        return undefined;
      },
    },
    getTotalEvmFiatAccountBalance() {
      return { balance: '0', fiatBalance: '0' };
    },
    async lookupEnabledNetworks() {
      return undefined;
    },
  };
  return { __esModule: true, default: engine };
});

// Minimal Engine/Engine singleton where needed
jest.mock('../../../core/Engine/Engine', () => {
  const singleton = {
    get context() {
      return {
        MultichainNetworkController: {
          async setActiveNetwork() {
            return undefined;
          },
          async getNetworksWithTransactionActivityByAccounts() {
            return undefined;
          },
        },
      };
    },
    get controllerMessenger() {
      return {
        subscribe() {
          return undefined;
        },
        unsubscribe() {
          return undefined;
        },
      };
    },
  };
  return { __esModule: true, default: singleton };
});

// Native deterministic version for gating logic
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getVersion: () => '99.0.0',
}));

// Mock Animated Easing to avoid importing heavy bezier implementation during tests
// and to prevent late imports after Jest environment teardown.
jest.mock('react-native/Libraries/Animated/Easing', () => {
  const identity = (t: number) => t;
  const returnIdentity = () => identity;
  const wrapIdentity = () => identity;

  return {
    // Core easings
    linear: identity,
    ease: identity,
    quad: identity,
    cubic: identity,
    poly: () => identity,
    sin: identity,
    circle: identity,
    exp: identity,
    elastic: returnIdentity,
    back: returnIdentity,
    bounce: identity,
    // Bezier should return an easing function
    bezier: returnIdentity,
    // Composition helpers usually accept an easing and return easing
    in: wrapIdentity,
    out: wrapIdentity,
    inOut: wrapIdentity,
    // Default export shape
    default: {
      linear: identity,
      ease: identity,
      quad: identity,
      cubic: identity,
      poly: () => identity,
      sin: identity,
      circle: identity,
      exp: identity,
      elastic: returnIdentity,
      back: returnIdentity,
      bounce: identity,
      bezier: returnIdentity,
      in: wrapIdentity,
      out: wrapIdentity,
      inOut: wrapIdentity,
    },
  };
});
