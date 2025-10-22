import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { PortfolioBalance } from '.';
import Engine from '../../../../../core/Engine';
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';

const { PreferencesController } = Engine.context;

// Mock the useMultichainBalances hook
const mockSelectedAccountMultichainBalance = {
  displayBalance: '$123.45',
  displayCurrency: 'USD',
  totalFiatBalance: 123.45,
  totalNativeTokenBalance: '0.1',
  nativeTokenUnit: 'ETH',
  shouldShowAggregatedPercentage: true,
  isPortfolioVieEnabled: false,
  aggregatedBalance: {
    ethFiat: 123.45,
    tokenFiat: 0,
    tokenFiat1dAgo: 0,
    ethFiat1dAgo: 100.0,
  },
  isLoadingAccount: false,
  tokenFiatBalancesCrossChains: [],
};

jest.mock('../../../../hooks/useMultichainBalances', () => ({
  useSelectedAccountMultichainBalances: jest.fn(() => ({
    selectedAccountMultichainBalance: mockSelectedAccountMultichainBalance,
  })),
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

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  }),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_DEPOSIT_CLICKED: 'CARD_ADD_FUNDS_DEPOSIT_CLICKED',
    RAMPS_BUTTON_CLICKED: 'RAMPS_BUTTON_CLICKED',
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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPortfolioBalance = (state: any = {}) =>
  renderWithProvider(<PortfolioBalance />, { state });

describe('PortfolioBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mock before each test
    const mockedHook = jest.mocked(useSelectedAccountMultichainBalances);
    mockedHook.mockReturnValue({
      selectedAccountMultichainBalance: mockSelectedAccountMultichainBalance,
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

  it('displays BalanceEmptyState when balance is zero', () => {
    // Mock zero balance
    const mockSelectedAccountMultichainBalanceZero = {
      displayBalance: '$0.00',
      displayCurrency: 'USD',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      shouldShowAggregatedPercentage: false,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 123.45,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 100.0,
      },
      isLoadingAccount: false,
      tokenFiatBalancesCrossChains: [],
    };

    const mockedHook = jest.mocked(useSelectedAccountMultichainBalances);
    mockedHook.mockReturnValue({
      selectedAccountMultichainBalance:
        mockSelectedAccountMultichainBalanceZero,
    });

    const { getByTestId, queryByTestId } = renderPortfolioBalance(initialState);

    // Should render BalanceEmptyState instead of balance text
    expect(getByTestId('portfolio-balance-empty-state')).toBeDefined();
    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
  });

  it('displays loader when balance is not available', () => {
    // Mock undefined balance
    const mockedHook = jest.mocked(useSelectedAccountMultichainBalances);
    mockedHook.mockReturnValue({
      selectedAccountMultichainBalance: undefined,
    });

    const { queryByTestId } = renderPortfolioBalance(initialState);

    // Should not render balance text or empty state
    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
    expect(queryByTestId('portfolio-balance-empty-state')).toBeNull();
  });
});
