import { RequestStatus } from '@metamask/bridge-controller';
import { renderBridgeScreen } from './tests/renderBridgeScreen';
import { tokenFactory, markNoFeeDestAsset } from './tests/BridgeView.builders';
import { createBridgeTestState } from '../../testUtils';
import {
  initialState as baseInitialState,
  evmAccountId,
} from '../../_mocks_/initialState';
import { strings } from '../../../../../../locales/i18n';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../types';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { setupIntegrationNetworkInterceptors } from '../../../../../util/test/integration/network';

// Background-only mocks (no hooks mocked)
jest.mock('../../../../../core/Engine', () => {
  const engine = {
    context: {
      // Provide only minimal controllers accessed indirectly by the UI/hooks
      GasFeeController: {
        startPolling: jest.fn(),
        stopPollingByPollingToken: jest.fn(),
      },
      NetworkController: {
        getNetworkConfigurationByNetworkClientId: jest.fn(),
        // Needed by getProviderByChainId → useLatestBalance
        findNetworkClientIdByChainId: jest.fn((chainId: string) =>
          // Return a deterministic client id for mainnet and a generic one otherwise
          chainId?.toLowerCase() === '0x1' ? 'mainnet' : 'custom',
        ),
        getNetworkClientById: jest.fn((id: string) => {
          // Minimal provider shape with request method used by balance fetching
          const twoEthHex = '0x1bc16d674ec80000';
          const provider = {
            request: jest.fn(
              async (args: { method: string; params?: unknown[] }) => {
                if (args?.method === 'eth_chainId') {
                  return '0x1';
                }
                if (args?.method === 'net_version') {
                  return '1';
                }
                if (args?.method === 'eth_blockNumber') {
                  // Return a plausible block number
                  return '0xabcdef';
                }
                if (
                  args?.method === 'eth_getBalance' ||
                  args?.method === 'eth_call'
                ) {
                  return twoEthHex;
                }
                return null;
              },
            ),
            // Event API stubs expected by Web3Provider in some code paths
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
      AccountsController: {
        state: {
          internalAccounts: {
            selectedAccount: '30786334-3935-4563-b064-363339643939',
            accounts: {
              '30786334-3935-4563-b064-363339643939': {
                id: '30786334-3935-4563-b064-363339643939',
                address: '0x1234567890123456789012345678901234567890',
                name: 'Account 1',
                type: 'eip155:eoa',
                scopes: ['eip155:0'],
                metadata: {
                  lastSelected: 0,
                  keyring: { type: 'HD Key Tree' },
                },
              },
            },
          },
        },
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0x1234567890123456789012345678901234567890'],
              type: 'HD Key Tree',
              metadata: { id: 'test', name: '' },
            },
          ],
        },
      },
    },
    getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue({
      balance: '1000000000000000000',
      fiatBalance: '2000',
    }),
  };
  return {
    __esModule: true,
    default: engine,
  };
});

// Install default network interceptors for integration tests
let restoreNetwork: (() => void) | undefined;
beforeAll(() => {
  restoreNetwork = setupIntegrationNetworkInterceptors();
});
afterAll(() => {
  restoreNetwork?.();
  restoreNetwork = undefined;
});

// Avoid Engine access inside address utils used by smart tx selectors
jest.mock('../../../../../util/address', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(() => false),
  getKeyringByAddress: jest.fn(() => undefined),
}));

// Avoid heavy UI/effects from QuoteDetailsCard when activeQuote is present
jest.mock('../../components/QuoteDetailsCard', () => ({
  __esModule: true,
  default: () => null,
}));

// Stabilize Blockaid validation to avoid effect loops due to changing function identity
jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => {
  const React = jest.requireActual('react');
  const { useCallback } = React;
  function useValidateBridgeTx() {
    const validateBridgeTx = useCallback(async () => ({ status: 'OK' }), []);
    return { validateBridgeTx };
  }
  return {
    __esModule: true,
    default: useValidateBridgeTx,
  };
});

// Ensure no-fee assets selector returns mUSD when targeting eip155:1
jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    selectBridgeQuotes: jest.fn(),
    selectNoFeeAssets: jest.fn(),
  };
});

// Simplify accounts hook to avoid heavy AccountsController metadata requirements in tests
jest.mock('../../../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      {
        id: '30786334-3935-4563-b064-363339643939',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Account 1',
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: true,
        caipAccountId: 'eip155:1:0x1234567890123456789012345678901234567890',
        scopes: ['eip155:0'],
      },
    ],
    ensByAccountAddress: {
      '0x1234567890123456789012345678901234567890': '',
    },
  }),
}));

// Provide deterministic app version for version gating logic used by bridge slice
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getVersion: () => '99.0.0',
}));

// Avoid third-party image/timing side-effects used by token icons
jest.mock('react-native-fade-in-image', () => 'FadeIn');
jest.mock('../../../../Base/RemoteImage', () => ({
  __esModule: true,
  default: () => null,
}));

describe('BridgeView (background-only)', () => {
  const bridgeSliceMock = jest.requireMock(
    '../../../../../core/redux/slices/bridge',
  );
  beforeEach(() => {
    jest.clearAllMocks();
    // Keep bridge quotes selector returning undefined by default (no active quote)
    bridgeSliceMock.selectBridgeQuotes.mockReset();
    bridgeSliceMock.selectBridgeQuotes.mockImplementation(() => ({
      activeQuote: undefined,
      recommendedQuote: undefined,
      isLoading: false,
    }));
    // Default no-fee assets: empty
    bridgeSliceMock.selectNoFeeAssets.mockReset();
    bridgeSliceMock.selectNoFeeAssets.mockImplementation(() => []);
  });

  it('renders initial UI with background mocked only', () => {
    // Arrange: Compose state with fetched status to avoid loading UI
    const state = createBridgeTestState(
      {
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [],
          quotesLastFetched: 1,
        },
        bridgeReducerOverrides: {
          // Ensure no amount so the UI shows the Select amount state
          sourceAmount: undefined,
          // Set a simple native ETH as source token to exercise balance path without typing
          sourceToken: tokenFactory('ETH', {
            chainId: '0x1' as Hex,
          }) as unknown as BridgeToken,
          destToken: undefined,
        },
      },
      {
        ...baseInitialState,
        engine: {
          ...baseInitialState.engine,
          backgroundState: {
            ...baseInitialState.engine.backgroundState,
            AccountsController: {
              ...baseInitialState.engine.backgroundState.AccountsController,
              internalAccounts: {
                ...baseInitialState.engine.backgroundState.AccountsController
                  .internalAccounts,
                accounts: {
                  ...baseInitialState.engine.backgroundState.AccountsController
                    .internalAccounts.accounts,
                  [evmAccountId]: {
                    ...baseInitialState.engine.backgroundState
                      .AccountsController.internalAccounts.accounts[
                      evmAccountId
                    ],
                    metadata: {
                      ...baseInitialState.engine.backgroundState
                        .AccountsController.internalAccounts.accounts[
                        evmAccountId
                      ].metadata,
                      keyring: { type: 'HD Key Tree' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    // Act: Render screen with real providers/hooks
    const { getByTestId } = renderBridgeScreen(state);

    // Assert: Source input is present (lightweight initial UI assertion)
    expect(getByTestId('source-token-area-input')).toBeTruthy();
  });

  it('shows no MM fee disclaimer when dest token is mUSD and fee is 0', async () => {
    const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;

    // Clone and enforce 0 bps fee on the active quote
    const active = {
      ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
    };
    const currentQuote = (active.quote as Record<string, unknown>) ?? {};
    active.quote = {
      ...currentQuote,
      // Only need metabridge fee information for this test
      feeData: {
        metabridge: { quoteBpsFee: 0 },
      },
      gasIncluded: true,
      srcChainId: 1,
      destChainId: 1,
    };

    // Build base state with Engine + Bridge controller overrides
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotesLastFetched: Date.now(),
      },
      bridgeReducerOverrides: {
        sourceAmount: '1.0',
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
        destToken: tokenFactory('mUSD', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });

    // Force the selector to return a stable recommendedQuote/activeQuote reference
    bridgeSliceMock.selectBridgeQuotes.mockImplementation(() => ({
      activeQuote: active,
      recommendedQuote: active,
      isLoading: false,
    }));

    // Ensure no-fee assets include mUSD on mainnet
    bridgeSliceMock.selectNoFeeAssets.mockImplementation(
      (_state: unknown, _chainId: unknown) => [musdAddress],
    );

    // Mark mUSD as no fee asset for eip155:1 in remote feature flags
    const updatedState = markNoFeeDestAsset(
      state as unknown as DeepPartial<RootState>,
      'eip155:1',
      musdAddress,
    ) as DeepPartial<RootState>;

    const { findByText } = renderBridgeScreen(updatedState);

    const expected = strings('bridge.no_mm_fee_disclaimer', {
      destTokenSymbol: 'mUSD',
    });

    expect(await findByText(expected)).toBeTruthy();
  });
});
