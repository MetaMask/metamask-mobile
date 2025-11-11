/**
 * Background-only default mocks for integration tests.
 * - Minimal Engine controllers used indirectly by UI/hooks
 * - Stable device/version and media mocks
 * - Address utilities that may access Engine
 *
 * Import this module at the top of an integration test file to install the mocks.
 */

// Engine minimal context
jest.mock('../../../core/Engine', () => {
  const engine = {
    context: {
      GasFeeController: {
        startPolling: jest.fn(),
        stopPollingByPollingToken: jest.fn(),
      },
      NetworkController: {
        getNetworkConfigurationByNetworkClientId: jest.fn(),
        findNetworkClientIdByChainId: jest.fn((chainId: string) =>
          chainId?.toLowerCase() === '0x1' ? 'mainnet' : 'custom',
        ),
        getNetworkClientById: jest.fn((id: string) => {
          const twoEthHex = '0x1bc16d674ec80000';
          const pad32 = (hex: string) => {
            const v = hex.startsWith('0x') ? hex.slice(2) : hex;
            return `0x${v.padStart(64, '0')}`;
          };
          const hundredEthHex = '0x56BC75E2D63100000';
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
                  // Return ABI-encoded uint256 (32-byte padded)
                  return pad32(twoEthHex);
                }
                return null;
              },
            ),
            on: jest.fn(),
            removeListener: jest.fn(),
          };
          return { id, provider };
        }),
      },
      BridgeStatusController: {
        submitTx: jest.fn().mockResolvedValue({ success: true }),
      },
      BridgeController: {
        resetState: jest.fn(),
        setBridgeFeatureFlags: jest.fn().mockResolvedValue(undefined),
        updateBridgeQuoteRequestParams: jest.fn(),
      },
    },
    getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue({
      balance: '1000000000000000000',
      fiatBalance: '2000',
    }),
  };
  return { __esModule: true, default: engine };
});

// Address helpers that sometimes read from Engine
jest.mock('../../../util/address', () => ({
  __esModule: true,
  ...jest.requireActual('../../../util/address'),
  isHardwareAccount: jest.fn(() => false),
  getKeyringByAddress: jest.fn(() => undefined),
}));

// Deterministic version for gating logic
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getVersion: () => '99.0.0',
}));

// Media and image side-effects
jest.mock('react-native-fade-in-image', () => 'FadeIn');
jest.mock('../../../components/Base/RemoteImage', () => ({
  __esModule: true,
  default: () => null,
}));
