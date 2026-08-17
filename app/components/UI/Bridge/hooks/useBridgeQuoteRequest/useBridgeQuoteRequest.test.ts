import '../../_mocks_/initialState';
import { DEBOUNCE_WAIT, useBridgeQuoteRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { runQuoteRequestCases } from '../quoteTestCaseRunners/runQuoteRequestCases';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  isSolanaChainId: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x1234567890123456789012345678901234567890'],
            type: 'HD Key Tree',
            metadata: {
              id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
              name: '',
            },
          },
        ],
      },
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      getNetworkClientById: jest.fn(() => ({
        provider: {
          request: jest.fn(),
          sendAsync: jest.fn(),
        },
        configuration: {
          chainId: '0x1',
        },
      })),
    },
  },
}));

jest.mock('../useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useInsufficientNativeReserveError', () => ({
  __esModule: true,
  useInsufficientNativeReserveError: jest.fn(),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

runQuoteRequestCases({
  debounceMs: DEBOUNCE_WAIT,
  expectedQuoteContext: undefined,
  render: (state, options) =>
    renderHookWithProvider(
      () =>
        options && 'latestSourceAtomicBalance' in options
          ? useBridgeQuoteRequest({
              latestSourceAtomicBalance: options.latestSourceAtomicBalance,
            })
          : useBridgeQuoteRequest(),
      { state },
    ),
});
