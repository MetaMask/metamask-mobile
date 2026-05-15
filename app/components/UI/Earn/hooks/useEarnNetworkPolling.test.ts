// Mock all the polling hooks
jest.mock('../../../hooks/AssetPolling/useTokenBalancesPolling', () =>
  jest.fn(),
);
jest.mock('../../../hooks/AssetPolling/useCurrencyRatePolling', () =>
  jest.fn(),
);
jest.mock('../../../hooks/AssetPolling/useTokenRatesPolling', () => jest.fn());
jest.mock('../../../hooks/AssetPolling/useAccountTrackerPolling', () =>
  jest.fn(),
);
jest.mock('../../../hooks/AssetPolling/useTokenDetectionPolling', () =>
  jest.fn(),
);

// Mock Engine

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TokenDetectionController: {
      detectTokens: jest.fn(),
    },
  },
}));

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useEarnNetworkPolling from './useEarnNetworkPolling';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import useTokenBalancesPolling from '../../../hooks/AssetPolling/useTokenBalancesPolling';
import useCurrencyRatePolling from '../../../hooks/AssetPolling/useCurrencyRatePolling';
import useTokenRatesPolling from '../../../hooks/AssetPolling/useTokenRatesPolling';
import useTokenDetectionPolling from '../../../hooks/AssetPolling/useTokenDetectionPolling';
import Engine from '../../../../core/Engine';

// Mock console.warn to avoid noise in tests
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
});

describe('useEarnNetworkPolling', () => {
  const mockUseTokenBalancesPolling = jest.mocked(useTokenBalancesPolling);
  const mockUseCurrencyRatePolling = jest.mocked(useCurrencyRatePolling);
  const mockUseTokenRatesPolling = jest.mocked(useTokenRatesPolling);
  const mockUseTokenDetectionPolling = jest.mocked(useTokenDetectionPolling);

  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  const mockSelectedAccount =
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
      MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount
    ];

  const mockState = {
    engine: {
      backgroundState: {
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        AccountTreeController: {
          accountTree: {
            wallets: {
              'keyring:test-wallet': {
                id: 'test-wallet',
                name: 'Test Wallet',
                groups: {
                  'keyring:test-wallet/ethereum': {
                    accounts: [mockSelectedAccount.id],
                  },
                },
              },
            },
          },
          selectedAccountGroup: 'keyring:test-wallet/ethereum',
        },
        PreferencesController: {
          useTokenDetection: true,
        },
      },
    },
  } as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindNetworkClientIdByChainId.mockImplementation((chainId: string) => {
      if (chainId === '0x1') return 'mainnet';
      if (chainId === '0x89') return 'polygon';
      throw new Error(`Network client not found for chain ${chainId}`);
    });
  });

  it('should call all polling hooks when mounted', () => {
    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    expect(mockUseTokenBalancesPolling).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
    });
    expect(mockUseCurrencyRatePolling).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
    });
    expect(mockUseTokenRatesPolling).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
    });
    expect(mockUseTokenDetectionPolling).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
      address: mockSelectedAccount.address,
    });
  });

  it('should initialize with empty chain IDs and network client IDs', () => {
    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    // Initially called with empty arrays
    expect(mockUseTokenBalancesPolling).toHaveBeenCalledWith({
      chainIds: [],
    });
    expect(mockUseCurrencyRatePolling).toHaveBeenCalledWith({
      chainIds: [],
    });
    expect(mockUseTokenRatesPolling).toHaveBeenCalledWith({
      chainIds: [],
    });
    expect(mockUseTokenDetectionPolling).toHaveBeenCalledWith({
      chainIds: [],
      address: mockSelectedAccount.address,
    });
  });

  it('should pass empty chainIds to useTokenDetectionPolling when useTokenDetection is false', () => {
    const stateWithoutTokenDetection = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          PreferencesController: {
            useTokenDetection: false,
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: stateWithoutTokenDetection,
    });

    expect(mockUseTokenDetectionPolling).toHaveBeenCalledWith({
      chainIds: [],
      address: mockSelectedAccount.address,
    });
  });

  it('should return null', () => {
    const { result } = renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    expect(result.current).toBeNull();
  });

  it('should call all polling hooks on every render', () => {
    const { rerender } = renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    // Clear mocks and rerender
    jest.clearAllMocks();
    rerender({});

    // All polling hooks should be called again
    expect(mockUseTokenBalancesPolling).toHaveBeenCalled();
    expect(mockUseCurrencyRatePolling).toHaveBeenCalled();
    expect(mockUseTokenRatesPolling).toHaveBeenCalled();
    expect(mockUseTokenDetectionPolling).toHaveBeenCalled();
  });
});
