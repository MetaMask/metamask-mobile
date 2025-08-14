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

// Force feature flag ON and mock balance selectors for aggregated path
jest.mock(
  '../../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    __esModule: true,
    selectMultichainAccountsState2Enabled: () => true,
  }),
);

jest.mock('../../../../../selectors/assets/balances', () => ({
  __esModule: true,
  selectBalanceForAllWallets: () => ({
    userCurrency: 'usd',
    wallets: {
      'wallet-1': {
        totalBalanceInUserCurrency: 100,
        groups: {
          'wallet-1/group-1': {
            walletId: 'wallet-1',
            groupId: 'wallet-1/group-1',
            totalBalanceInUserCurrency: 100,
            userCurrency: 'usd',
          },
        },
      },
    },
  }),
  selectAggregatedBalanceByAccountGroup: () => () => ({
    walletId: 'wallet-1',
    groupId: 'wallet-1/group-1',
    totalBalanceInUserCurrency: 100,
    userCurrency: 'usd',
  }),
  selectPortfolioChangeByAccountGroup: () => () => ({
    amountChangeInUserCurrency: 10,
    percentChange: 1,
    userCurrency: 'usd',
  }),
}));

// Do not mock AccountGroupBalanceChange; assert by its inner test IDs

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

  describe('Feature flagged aggregated percentage', () => {
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
  });
});
