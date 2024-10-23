import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import BN5 from 'bnjs5';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import AppConstants from '../../../../../../app/core/AppConstants';
import Routes from '../../../../../../app/constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { PortfolioBalance } from '.';

jest.mock('../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
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
        contractBalances: {
          '0x00': new BN5(2),
          '0x01': new BN5(2),
          '0x02': new BN5(0),
        },
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
});
