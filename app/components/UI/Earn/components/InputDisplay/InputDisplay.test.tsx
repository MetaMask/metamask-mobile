import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import InputDisplay, { InputDisplayProps } from '.';
import { INPUT_DISPLAY_TEST_IDS } from './InputDisplay.testIds';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/useEarnTokens', () => () => ({
  getEarnToken: jest.fn(() => ({
    experience: { type: 'STABLECOIN_LENDING' },
    chainId: '1',
    symbol: 'ETH',
    ticker: 'ETH',
    name: 'Ethereum',
    address: '0x123',
    aggregators: [],
    decimals: 18,
    image: '',
    balance: '100',
    logo: undefined,
    isETH: true,
    isNative: true,
  })),
  getOutputToken: jest.fn(() => ({
    experience: { type: 'STABLECOIN_LENDING' },
    chainId: '1',
    symbol: 'ETH',
    ticker: 'ETH',
    name: 'Ethereum',
    address: '0x123',
    aggregators: [],
    decimals: 18,
    image: '',
    balance: '100',
    logo: undefined,
    isETH: true,
    isNative: true,
  })),
}));

const mockToken = {
  address: '0x123',
  aggregators: [],
  decimals: 18,
  image: '',
  name: 'Ethereum',
  symbol: 'ETH',
  balance: '100',
  logo: undefined,
  isETH: true,
  isNative: true,
  ticker: 'ETH',
  chainId: '1',
};

const defaultProps = {
  isOverMaximum: {
    isOverMaximumEth: false,
    isOverMaximumToken: false,
  },
  balanceText: 'Balance',
  balanceValue: '100',
  isNonZeroAmount: true,
  isFiat: false,
  asset: mockToken,
  amountToken: '50',
  amountFiatNumber: '1000',
  currentCurrency: 'USD',
  handleCurrencySwitch: jest.fn(),
  currencyToggleValue: 'ETH',
};

const initialState = {
  ...initialRootState,
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const renderComponent = (props: InputDisplayProps = defaultProps) =>
  renderWithProvider(<InputDisplay {...props} />, {
    state: initialState,
  });

describe('InputDisplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('renders balance text correctly', () => {
    const { getByText } = renderComponent();

    getByText('Balance: 100');
  });

  it('renders error text when over maximum token', () => {
    const { getByText } = renderComponent({
      ...defaultProps,
      isOverMaximum: { isOverMaximumEth: false, isOverMaximumToken: true },
      asset: {
        ...mockToken,
        symbol: 'USDC',
        ticker: 'USDC',
        name: 'USD Coin',
      },
    });

    getByText('Not enough USDC');
  });

  it('renders error text when over maximum ETH', () => {
    const { getByText } = renderComponent({
      ...defaultProps,
      isOverMaximum: { isOverMaximumEth: true, isOverMaximumToken: false },
    });

    getByText('Not enough ETH');
  });

  it('exposes the fiat amount and unit as a combined text label', () => {
    const props = { ...defaultProps, isFiat: true };
    const { getByRole } = renderComponent(props);

    expect(getByRole('text', { name: '1000 USD' })).toBeOnTheScreen();
  });

  it('exposes the token amount and unit as a combined text label', () => {
    const { getByRole } = renderComponent({
      ...defaultProps,
      isFiat: false,
      asset: {
        ...mockToken,
        symbol: 'USDC',
        ticker: 'USDC',
        name: 'USD Coin',
      },
    });

    expect(getByRole('text', { name: '50 USDC' })).toBeOnTheScreen();
  });

  it('exposes and activates the amount row as a labeled button', () => {
    const onPressAmount = jest.fn();
    const { getByRole } = renderComponent({
      ...defaultProps,
      onPressAmount,
    });
    const amountButton = getByRole('button', { name: '50 ETH' });

    fireEvent.press(amountButton);

    expect(amountButton).toBeOnTheScreen();
    expect(onPressAmount).toHaveBeenCalledTimes(1);
  });

  it('calls handleCurrencySwitch when currency toggle is pressed', () => {
    const { getByTestId } = renderComponent();
    const currencyToggle = getByTestId('currency-toggle');

    fireEvent.press(currencyToggle);

    expect(defaultProps.handleCurrencySwitch).toHaveBeenCalled();
  });

  it('Opens lending max safe withdrawal tooltip on icon pressed', async () => {
    const { getByTestId } = renderComponent({
      ...defaultProps,
      asset: {
        ...mockToken,
        symbol: 'USDC',
        ticker: 'USDC',
        name: 'USD Coin',
      },
      maxWithdrawalAmount: renderFromTokenMinimalUnit(25, 16),
    });

    const maxSafeWithdrawalTooltipIcon = getByTestId(
      INPUT_DISPLAY_TEST_IDS.LENDING_MAX_SAFE_WITHDRAWAL_TOOLTIP_ICON,
    );

    await act(async () => {
      fireEvent.press(maxSafeWithdrawalTooltipIcon);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.MODALS.ROOT, {
      screen: Routes.EARN.MODALS.LENDING_MAX_WITHDRAWAL,
    });
  });
});
