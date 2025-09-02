// Mock all the polling hooks
jest.mock('../../../hooks/AssetPolling/useTokenListPolling', () => jest.fn());
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
    TokensController: {
      addTokens: jest.fn(),
    },
  },
}));

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useEarnNetworkPolling from './useEarnNetworkPolling';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import useTokenListPolling from '../../../hooks/AssetPolling/useTokenListPolling';
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
  const mockUseTokenListPolling = jest.mocked(useTokenListPolling);
  const mockUseTokenBalancesPolling = jest.mocked(useTokenBalancesPolling);
  const mockUseCurrencyRatePolling = jest.mocked(useCurrencyRatePolling);
  const mockUseTokenRatesPolling = jest.mocked(useTokenRatesPolling);
  const mockUseTokenDetectionPolling = jest.mocked(useTokenDetectionPolling);

  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );
  const mockDetectTokens = jest.mocked(
    Engine.context.TokenDetectionController.detectTokens,
  );
  const mockAddTokens = jest.mocked(Engine.context.TokensController.addTokens);

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
            selectedAccountGroup: 'keyring:test-wallet/ethereum',
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
        },
        PreferencesController: {
          useTokenDetection: true,
        },
        TokensController: {
          allDetectedTokens: {
            '0x1': {
              [mockSelectedAccount.address]: {
                '0x123': {
                  address: '0x123',
                  symbol: 'TEST',
                  decimals: 18,
                  image: 'test-image.png',
                  name: 'Test Token',
                },
              },
            },
            '0x89': {
              [mockSelectedAccount.address]: {
                '0x456': {
                  address: '0x456',
                  symbol: 'TEST2',
                  decimals: 6,
                  image: 'test2-image.png',
                  name: 'Test Token 2',
                },
              },
            },
          },
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
    mockDetectTokens.mockResolvedValue(undefined);
    mockAddTokens.mockResolvedValue(undefined);
  });

  it('should call all polling hooks when mounted', () => {
    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    expect(mockUseTokenListPolling).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
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
    expect(mockUseTokenListPolling).toHaveBeenCalledWith({
      chainIds: [],
    });
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

  it('should call TokenDetectionController.detectTokens when component mounts', () => {
    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    expect(mockDetectTokens).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
      selectedAddress: mockSelectedAccount.address,
    });
  });

  it('should not call detectTokens when useTokenDetection is false', () => {
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

    expect(mockDetectTokens).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
      selectedAddress: mockSelectedAccount.address,
    });
  });

  it('should not call detectTokens when no selected account', () => {
    const stateWithoutAccount = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountsController: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE,
            internalAccounts: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
              selectedAccount: '',
            },
          },
          AccountTreeController: {
            accountTree: {
              selectedAccountGroup: '',
              wallets: {},
            },
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: stateWithoutAccount,
    });

    expect(mockDetectTokens).toHaveBeenCalledWith({
      chainIds: expect.any(Array),
      selectedAddress: undefined,
    });
  });

  it('should call TokensController.addTokens for detected tokens', async () => {
    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: mockState,
    });

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify tokens are added (order may vary based on LENDING_CHAIN_IDS)
    expect(mockAddTokens).toHaveBeenCalledWith(
      [
        {
          address: '0x123',
          symbol: 'TEST',
          decimals: 18,
          image: 'test-image.png',
          name: 'Test Token',
          isERC721: false,
        },
      ],
      'mainnet',
    );
  });

  it('should not call addTokens when no detected tokens', async () => {
    const stateWithoutDetectedTokens = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          TokensController: {
            allDetectedTokens: {},
          },
        },
      },
    } as unknown as RootState;

    renderHookWithProvider(() => useEarnNetworkPolling(), {
      state: stateWithoutDetectedTokens,
    });

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockAddTokens).not.toHaveBeenCalled();
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

  it('should handle addTokens errors gracefully', async () => {
    mockAddTokens.mockRejectedValue(new Error('Failed to add tokens'));

    expect(() => {
      renderHookWithProvider(() => useEarnNetworkPolling(), {
        state: mockState,
      });
    }).not.toThrow();

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('should handle detectTokens errors gracefully', async () => {
    mockDetectTokens.mockRejectedValue(new Error('Failed to detect tokens'));

    expect(() => {
      renderHookWithProvider(() => useEarnNetworkPolling(), {
        state: mockState,
      });
    }).not.toThrow();

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
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
    expect(mockUseTokenListPolling).toHaveBeenCalled();
    expect(mockUseTokenBalancesPolling).toHaveBeenCalled();
    expect(mockUseCurrencyRatePolling).toHaveBeenCalled();
    expect(mockUseTokenRatesPolling).toHaveBeenCalled();
    expect(mockUseTokenDetectionPolling).toHaveBeenCalled();
  });
});
