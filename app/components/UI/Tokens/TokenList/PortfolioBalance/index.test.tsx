import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import AppConstants from '../../../../../../app/core/AppConstants';
import Routes from '../../../../../../app/constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { PortfolioBalance } from '.';
import Engine from '../../../../../core/Engine';
import { EYE_SLASH_ICON_TEST_ID, EYE_ICON_TEST_ID } from './index.constants';

const { PreferencesController } = Engine.context;

// Mock Date.now() to return a fixed timestamp for deterministic tests
const FIXED_TIMESTAMP = 123;
global.Date.now = jest.fn(() => FIXED_TIMESTAMP);

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

const mockNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      push: mockPush,
    }),
  };
});

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPortfolioBalance = (state: any = {}) =>
  renderWithProvider(<PortfolioBalance />, { state });

describe('PortfolioBalance', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
  });

  it('fiat balance must be defined', () => {
    const { getByTestId } = renderPortfolioBalance(initialState);
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
  });

  it('portfolio button should render correctly', () => {
    const { getByTestId } = renderPortfolioBalance(initialState);

    expect(getByTestId(WalletViewSelectorsIDs.PORTFOLIO_BUTTON)).toBeDefined();
  });

  it('navigates to Portfolio url when portfolio button is pressed', () => {
    const { getByTestId } = renderPortfolioBalance(initialState);

    const expectedUrl = `${AppConstants.PORTFOLIO.URL}/?metamaskEntry=mobile&metricsEnabled=false&marketingEnabled=${initialState.security.dataCollectionForMarketing}`;

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.PORTFOLIO_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      params: {
        newTabUrl: expectedUrl,
        timestamp: 123,
      },
      screen: Routes.BROWSER.VIEW,
    });
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

  it('toggles privacy mode when eye icon is pressed', () => {
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

  it('renders eye icon when privacy mode is off', () => {
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

    const eyeIcon = getByTestId(EYE_ICON_TEST_ID);
    expect(eyeIcon).toBeDefined();
    expect(eyeIcon.props.name).toBe('Eye');
  });

  it('renders eye-slash icon when privacy mode is on', () => {
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

    const eyeSlashIcon = getByTestId(EYE_SLASH_ICON_TEST_ID);
    expect(eyeSlashIcon).toBeDefined();
    expect(eyeSlashIcon.props.name).toBe('EyeSlash');
  });
});
