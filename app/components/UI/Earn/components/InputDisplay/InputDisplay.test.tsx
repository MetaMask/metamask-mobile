import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import InputDisplay, { INPUT_DISPLAY_TEST_IDS, InputDisplayProps } from '.';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { renderFromTokenMinimalUnit } from '../../../../../util/number/legacy';
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

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(() => false),
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

  it('displays amount in fiat when isFiat is true', () => {
    const props = { ...defaultProps, isFiat: true };
    const { getByText } = renderComponent(props);
    expect(getByText('1000')).toBeTruthy();
    expect(getByText('USD')).toBeTruthy();
  });

  it('displays amount in token when isFiat is false', () => {
    const { getByText } = renderComponent({
      ...defaultProps,
      isFiat: false,
      asset: {
        ...mockToken,
        symbol: 'USDC',
        ticker: 'USDC',
        name: 'USD Coin',
      },
    });
    expect(getByText('50')).toBeTruthy();
    expect(getByText('USDC')).toBeTruthy();
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
