import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { PortfolioBalance } from '.';
import Engine from '../../../../../core/Engine';
import {
  FORMATTED_VALUE_PRICE_TEST_ID,
  FORMATTED_PERCENTAGE_TEST_ID,
} from '../../../Assets/BalanceChange/constants';

// Mock feature flag selector - will be controlled per test
const mockSelectMultichainAccountsState2Enabled = jest.fn();
jest.mock(
  '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    __esModule: true,
    selectMultichainAccountsState2Enabled: () =>
      mockSelectMultichainAccountsState2Enabled(),
  }),
);

// Mock balance selectors - will be controlled per test
const mockSelectBalanceForAllWallets = jest.fn();
const mockSelectBalanceByAccountGroup = jest.fn();
const mockSelectBalanceChangeByAccountGroup = jest.fn();
jest.mock('../../../../../selectors/assets/balances', () => ({
  __esModule: true,
  selectBalanceForAllWallets: () => mockSelectBalanceForAllWallets(),
  selectBalanceByAccountGroup: () => () => mockSelectBalanceByAccountGroup(),
  selectBalanceChangeByAccountGroup: () => () =>
    mockSelectBalanceChangeByAccountGroup(),
}));

// Ensure wallet/group resolution works for the test's selected account
jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    __esModule: true,
    selectWalletByAccount: () => (_accountId: string) => ({
      id: 'wallet-1',
      groups: {
        'wallet-1/group-1': { accounts: ['acc-1'] },
      },
    }),
  }),
);

const { PreferencesController } = Engine.context;

// Mock the useMultichainBalances hook
const mockSelectedAccountMultichainBalance = {
  displayBalance: '$123.45',
  totalFiatBalance: '123.45',
  shouldShowAggregatedPercentage: true,
  tokenFiatBalancesCrossChains: [],
};

jest.mock('../../../../hooks/useMultichainBalances', () => ({
  useSelectedAccountMultichainBalances: () => ({
    selectedAccountMultichainBalance: mockSelectedAccountMultichainBalance,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
    },
    PreferencesController: {
      setPrivacyMode: jest.fn(),
    },
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      state: {
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {
          '0x1': {
            blockExplorerUrls: [],
            chainId: '0x1',
            defaultRpcEndpointIndex: 1,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'infura',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
              {
                name: 'public',
                networkClientId: 'ea57f659-c004-4902-bfca-0c9688a43872',
                type: 'custom',
                url: 'https://mainnet-rpc.publicnode.com',
              },
            ],
          },
        },
      },
      TokensController: {
        tokens: [
          {
            name: 'Ethereum',
            symbol: 'ETH',
            address: '0x0',
            decimals: 18,
            isETH: true,

            balanceFiat: '< $0.01',
            iconUrl: '',
          },
          {
            name: 'Bat',
            symbol: 'BAT',
            address: '0x01',
            decimals: 18,
            balanceFiat: '$0',
            iconUrl: '',
          },
          {
            name: 'Link',
            symbol: 'LINK',
            address: '0x02',
            decimals: 18,
            balanceFiat: '$0',
            iconUrl: '',
          },
        ],
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x0': { price: 0.005 },
            '0x01': { price: 0.005 },
            '0x02': { price: 0.005 },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        currencyRates: {
          ETH: {
            conversionRate: 1,
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      MultichainNetworkController: {
        isEvmSelected: true,
      },
    },
  },
  settings: {
    primaryCurrency: 'usd',
    hideZeroBalanceTokens: true,
  },
  security: {
    dataCollectionForMarketing: true,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPortfolioBalance = (state: any = {}) =>
  renderWithProvider(<PortfolioBalance />, { state });

describe('PortfolioBalance', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);
    mockSelectBalanceForAllWallets.mockReturnValue({
      userCurrency: 'usd',
      wallets: {
        'wallet-1': {
          totalBalanceInUserCurrency: 1000,
          groups: {
            'wallet-1/group-1': {
              walletId: 'wallet-1',
              groupId: 'wallet-1/group-1',
              totalBalanceInUserCurrency: 500,
              userCurrency: 'usd',
            },
          },
        },
      },
    });
    mockSelectBalanceByAccountGroup.mockReturnValue({
      walletId: 'wallet-1',
      groupId: 'wallet-1/group-1',
      totalBalanceInUserCurrency: 500,
      userCurrency: 'usd',
    });
    mockSelectBalanceChangeByAccountGroup.mockReturnValue({
      amountChangeInUserCurrency: 10,
      percentChange: 1,
      userCurrency: 'usd',
    });
  });

  it('fiat balance must be defined', () => {
    const { getByTestId } = renderPortfolioBalance(initialState);
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
  });

  it('renders sensitive text when privacy mode is off', () => {
    const { getByTestId } = renderPortfolioBalance({
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            privacyMode: false,
          },
        },
      },
    });
    const sensitiveText = getByTestId(
      WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT,
    );
    expect(sensitiveText.props.isHidden).toBeFalsy();
  });

  it('hides sensitive text when privacy mode is on', () => {
    const { getByTestId } = renderPortfolioBalance({
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            privacyMode: true,
          },
        },
      },
    });
    const sensitiveText = getByTestId(
      WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT,
    );
    expect(sensitiveText.props.children).toEqual('••••••••••••');
  });

  it('toggles privacy mode when balance container is pressed', () => {
    const { getByTestId } = renderPortfolioBalance({
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            privacyMode: false,
          },
        },
      },
    });

    const balanceContainer = getByTestId('balance-container');
    fireEvent.press(balanceContainer);

    expect(PreferencesController.setPrivacyMode).toHaveBeenCalledWith(true);
  });

  describe('Feature flag behavior', () => {
    describe('when feature flag is OFF (legacy behavior)', () => {
      it('renders legacy balance display without aggregated percentage', () => {
        mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);

        const { getByTestId, queryByTestId } =
          renderPortfolioBalance(initialState);

        // Should show legacy balance
        expect(
          getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
        ).toBeDefined();

        // Should NOT show aggregated percentage components
        expect(queryByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeNull();
        expect(queryByTestId(FORMATTED_PERCENTAGE_TEST_ID)).toBeNull();
      });

      it('falls back to legacy balance when aggregated data is unavailable', () => {
        mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);
        mockSelectBalanceForAllWallets.mockReturnValue(null);

        const { getByTestId, queryByTestId } =
          renderPortfolioBalance(initialState);

        // Should still show legacy balance
        expect(
          getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
        ).toBeDefined();

        // Should NOT show aggregated components
        expect(queryByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeNull();
        expect(queryByTestId(FORMATTED_PERCENTAGE_TEST_ID)).toBeNull();
      });
    });

    describe('when feature flag is ON (new aggregated behavior)', () => {
      beforeEach(() => {
        mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
      });

      it('renders AccountGroupBalanceChange when flag is ON and change exists', () => {
        // Arrange: minimal state, selected account and wallet scaffold
        const state = {
          ...initialState,
          engine: {
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    'acc-1': { id: 'acc-1', address: '0xabc' },
                  },
                  selectedAccount: 'acc-1',
                },
              },
              AccountTreeController: {
                accountTree: {
                  wallets: {
                    'wallet-1': { id: 'wallet-1', groups: {} },
                  },
                  selectedAccountGroup: 'wallet-1/group-1',
                },
              },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  multichainAccountsState2: { enabled: true },
                },
              },
            },
          },
        } as const;

        // Act
        const { getByTestId } = renderPortfolioBalance(state);

        // Assert by inner test IDs rendered by AccountGroupBalanceChange
        const amountEl = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
        const percentEl = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
        expect(String(amountEl.props.children)).toContain('+');
        expect(String(amountEl.props.children)).toMatch(/\$/);
        expect(String(amountEl.props.children)).toMatch(/10/);
        expect(percentEl.props.children).toBe('(+1.00%)');
      });

      it('renders aggregated balance when feature flag is ON', () => {
        const state = {
          ...initialState,
          engine: {
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    'acc-1': { id: 'acc-1', address: '0xabc' },
                  },
                  selectedAccount: 'acc-1',
                },
              },
              AccountTreeController: {
                accountTree: {
                  wallets: {
                    'wallet-1': { id: 'wallet-1', groups: {} },
                  },
                  selectedAccountGroup: 'wallet-1/group-1',
                },
              },
            },
          },
        } as const;

        const { getByTestId } = renderPortfolioBalance(state);

        // Should show aggregated balance components
        expect(getByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeDefined();
        expect(getByTestId(FORMATTED_PERCENTAGE_TEST_ID)).toBeDefined();
      });

      it('handles missing portfolio change data gracefully', () => {
        mockSelectBalanceChangeByAccountGroup.mockReturnValue(null);

        const state = {
          ...initialState,
          engine: {
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    'acc-1': { id: 'acc-1', address: '0xabc' },
                  },
                  selectedAccount: 'acc-1',
                },
              },
              AccountTreeController: {
                accountTree: {
                  wallets: {
                    'wallet-1': { id: 'wallet-1', groups: {} },
                  },
                  selectedAccountGroup: 'wallet-1/group-1',
                },
              },
            },
          },
        } as const;

        const { getByTestId, queryByTestId } = renderPortfolioBalance(state);

        // Should still show balance
        expect(
          getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
        ).toBeDefined();

        // Should NOT show change components when no change data
        expect(queryByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeNull();
        expect(queryByTestId(FORMATTED_PERCENTAGE_TEST_ID)).toBeNull();
      });

      it('handles missing aggregated balance data gracefully', () => {
        mockSelectBalanceByAccountGroup.mockReturnValue(null);

        const state = {
          ...initialState,
          engine: {
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    'acc-1': { id: 'acc-1', address: '0xabc' },
                  },
                  selectedAccount: 'acc-1',
                },
              },
              AccountTreeController: {
                accountTree: {
                  wallets: {
                    'wallet-1': { id: 'wallet-1', groups: {} },
                  },
                  selectedAccountGroup: 'wallet-1/group-1',
                },
              },
            },
          },
        } as const;

        const { getByTestId, queryByTestId } = renderPortfolioBalance(state);

        // Should fall back to legacy balance display
        expect(
          getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
        ).toBeDefined();
        expect(queryByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeNull();
        expect(queryByTestId(FORMATTED_PERCENTAGE_TEST_ID)).toBeNull();
      });
    });
  });

  describe('Data flow validation', () => {
    it('uses correct selectors when feature flag is ON', () => {
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

      const state = {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            AccountsController: {
              internalAccounts: {
                accounts: {
                  'acc-1': { id: 'acc-1', address: '0xabc' },
                },
                selectedAccount: 'acc-1',
              },
            },
            AccountTreeController: {
              accountTree: {
                wallets: {
                  'wallet-1': { id: 'wallet-1', groups: {} },
                },
                selectedAccountGroup: 'wallet-1/group-1',
              },
            },
          },
        },
      } as const;

      renderPortfolioBalance(state);

      // Verify the correct selectors were called
      expect(mockSelectMultichainAccountsState2Enabled).toHaveBeenCalled();
      expect(mockSelectBalanceForAllWallets).toHaveBeenCalled();
      expect(mockSelectBalanceByAccountGroup).toHaveBeenCalled();
      expect(mockSelectBalanceChangeByAccountGroup).toHaveBeenCalled();
    });

    it('does not call aggregated selectors when feature flag is OFF', () => {
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);

      renderPortfolioBalance(initialState);

      // Should not call aggregated selectors
      expect(mockSelectBalanceForAllWallets).not.toHaveBeenCalled();
      expect(mockSelectBalanceByAccountGroup).not.toHaveBeenCalled();
      expect(mockSelectBalanceChangeByAccountGroup).not.toHaveBeenCalled();
    });
  });

  describe('Error handling and edge cases', () => {
    it('handles selector errors gracefully', () => {
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
      mockSelectBalanceForAllWallets.mockImplementation(() => {
        throw new Error('Selector error');
      });

      const state = {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            AccountsController: {
              internalAccounts: {
                accounts: {
                  'acc-1': { id: 'acc-1', address: '0xabc' },
                },
                selectedAccount: 'acc-1',
              },
            },
            AccountTreeController: {
              accountTree: {
                wallets: {
                  'wallet-1': { id: 'wallet-1', groups: {} },
                },
                selectedAccountGroup: 'wallet-1/group-1',
              },
            },
          },
        },
      } as const;

      // Should not crash, should fall back to legacy display
      const { getByTestId, queryByTestId } = renderPortfolioBalance(state);

      expect(
        getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
      ).toBeDefined();
      expect(queryByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeNull();
    });

    it('handles missing account tree data', () => {
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

      const state = {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            AccountTreeController: {
              accountTree: undefined,
            },
          },
        },
      } as const;

      const { getByTestId, queryByTestId } = renderPortfolioBalance(state);

      // Should fall back gracefully
      expect(
        getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
      ).toBeDefined();
      expect(queryByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeNull();
    });
  });
});
