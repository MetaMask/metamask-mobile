import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import QuickBuyActionFooter from './QuickBuyActionFooter';
import { useQuickBuyContext } from '../useQuickBuyContext';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./QuickBuyQuickAmounts', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(Text, { testID: 'quick-buy-quick-amounts' }),
  };
});

jest.mock('./QuickBuyTokenIcon', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./QuickBuyRateTag', () => {
  const ReactMock = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress }: { label?: string; onPress?: () => void }) =>
      ReactMock.createElement(
        Pressable,
        { testID: 'quick-buy-rate-tag-pressable', onPress },
        ReactMock.createElement(Text, { testID: 'quick-buy-rate-tag' }, label),
      ),
  };
});

jest.mock('../QuickBuyBanners', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../QuickBuyConfirmButton', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID, state }: { testID?: string; state: string }) =>
      ReactMock.createElement(Text, { testID }, `confirm-button:${state}`),
  };
});

const baseContext = {
  confirmButtonState: 'idle' as const,
  getButtonLabel: () => 'Buy',
  hasValidAmount: false,
  isConfirmDisabled: true,
  handleBuy: jest.fn(),
  metamaskFeePercent: 0,
  isHardwareSolanaBlocked: false,
  tradeMode: 'buy' as const,
  sourceToken: undefined,
  sourceBalanceFiat: undefined,
  destBalanceFiat: undefined,
  destToken: undefined,
  selectedReceiveToken: undefined,
  estimatedReceiveFiat: '$123.75',
  isBlockingQuoteLoad: false,
  isPriceImpactError: false,
  features: { payWithSheet: true, quoteDetails: true },
  setActiveScreen: jest.fn(),
  isKeypadOpen: false,
};

describe('QuickBuyActionFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(baseContext);
  });

  it('opens Pay with on all networks', () => {
    render(<QuickBuyActionFooter />);

    fireEvent.press(screen.getByTestId('quick-buy-pay-with-button'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setTokenSelectorNetworkFilter',
      payload: undefined,
    });
    expect(baseContext.setActiveScreen).toHaveBeenCalledWith('payWith');
  });

  it("opens Receive filtered to the selected receive token's chain", () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      tradeMode: 'sell',
      selectedReceiveToken: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x89',
        symbol: 'POL',
        decimals: 18,
      },
    });
    render(<QuickBuyActionFooter />);

    fireEvent.press(screen.getByTestId('quick-buy-pay-with-button'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setTokenSelectorNetworkFilter',
      payload: 'eip155:137',
    });
    expect(baseContext.setActiveScreen).toHaveBeenCalledWith('payWith');
  });

  it('renders the confirm button in idle state when not loading', () => {
    render(<QuickBuyActionFooter />);
    expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
    expect(screen.getByText('confirm-button:idle')).toBeOnTheScreen();
  });

  it('renders the confirm button in loading state while quotes are fetched', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      confirmButtonState: 'loading',
      isConfirmDisabled: true,
    });
    render(<QuickBuyActionFooter />);
    expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
    expect(screen.getByText('confirm-button:loading')).toBeOnTheScreen();
  });

  it('renders quick-amount pills when the feature flag is enabled', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      features: {
        payWithSheet: true,
        quickAmountPills: true,
        quoteDetails: true,
      },
    });
    render(<QuickBuyActionFooter />);
    expect(screen.getByTestId('quick-buy-quick-amounts')).toBeOnTheScreen();
  });

  it('hides quick-amount pills when the feature flag is disabled', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      features: {
        payWithSheet: true,
        quickAmountPills: false,
        quoteDetails: true,
      },
    });
    render(<QuickBuyActionFooter />);
    expect(screen.queryByTestId('quick-buy-quick-amounts')).toBeNull();
  });

  it('renders the Est. receive row and navigates to quote details when pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
    });

    render(<QuickBuyActionFooter />);

    expect(
      screen.getByText('social_leaderboard.quick_buy.est_receive'),
    ).toBeOnTheScreen();
    expect(screen.getByText('$123.75')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-gas-fee-deduction'),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('quick-buy-rate-tag-pressable'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });

  it('shows Est. receive with the gas deduction badge for gasless quotes', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      estimatedReceiveFiat: '$121.40',
      gasFeeDeductionLabel: '-$1.19 for gas',
    });

    render(<QuickBuyActionFooter />);

    expect(
      screen.getByText('social_leaderboard.quick_buy.est_receive'),
    ).toBeOnTheScreen();
    expect(screen.getByText('-$1.19 for gas')).toBeOnTheScreen();
    expect(screen.getByText('$121.40')).toBeOnTheScreen();
  });

  it('hides the Est. receive row until a quote value is available', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      estimatedReceiveFiat: undefined,
    });

    render(<QuickBuyActionFooter />);

    expect(
      screen.queryByText('social_leaderboard.quick_buy.est_receive'),
    ).not.toBeOnTheScreen();
  });

  it('shows a loading skeleton while the quote is loading', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      estimatedReceiveFiat: undefined,
      hasValidAmount: true,
      isBlockingQuoteLoad: true,
      gasFeeDeductionLabel: '-$1.19 for gas',
    });

    render(<QuickBuyActionFooter />);

    expect(
      screen.queryByText('social_leaderboard.quick_buy.est_receive'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-est-receive-label-loading'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-est-receive-loading'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('-$1.19 for gas')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('quick-buy-rate-tag')).not.toBeOnTheScreen();
  });

  it('keeps the footer interactive while the keypad is open', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      isKeypadOpen: true,
      features: {
        payWithSheet: true,
        quickAmountPills: true,
        quoteDetails: true,
      },
    });

    render(<QuickBuyActionFooter />);

    expect(screen.queryByTestId('quick-buy-footer-reveal')).toBeNull();
    expect(screen.getByTestId('quick-buy-pay-with-button')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-quick-amounts')).toBeOnTheScreen();
  });

  describe('when the user has nothing to pay with (TSA-984)', () => {
    const noFundsContext = {
      ...baseContext,
      hasNoPayWithFunds: true,
      isConfirmDisabled: false,
      getButtonLabel: () => 'social_leaderboard.quick_buy.add_funds',
      features: {
        payWithSheet: true,
        quickAmountPills: true,
        quoteDetails: true,
      },
    };

    it('makes the quote-dependent rows inert', () => {
      (useQuickBuyContext as jest.Mock).mockReturnValue(noFundsContext);

      render(<QuickBuyActionFooter />);

      const disabled = screen.getByTestId('quick-buy-disabled-footer');
      expect(disabled.props.pointerEvents).toBe('none');
      expect(
        within(disabled).getByTestId('quick-buy-quick-amounts'),
      ).toBeOnTheScreen();
      expect(
        within(disabled).getByTestId('quick-buy-pay-with-button'),
      ).toBeOnTheScreen();
      expect(
        within(disabled).getByTestId('quick-buy-rate-tag-pressable'),
      ).toBeOnTheScreen();
    });

    it('disables the Pay with picker and the total row individually', () => {
      const setActiveScreen = jest.fn();
      (useQuickBuyContext as jest.Mock).mockReturnValue({
        ...noFundsContext,
        setActiveScreen,
      });

      render(<QuickBuyActionFooter />);

      // pointerEvents blocks real touches, but the controls also opt out on
      // their own so assistive tech announces them as unavailable rather than
      // offering buttons that cannot respond.
      fireEvent.press(screen.getByTestId('quick-buy-pay-with-button'));
      fireEvent.press(screen.getByTestId('quick-buy-rate-tag-pressable'));
      expect(setActiveScreen).not.toHaveBeenCalled();
    });

    it('leaves the Add funds CTA outside the inert region', () => {
      (useQuickBuyContext as jest.Mock).mockReturnValue(noFundsContext);

      render(<QuickBuyActionFooter />);

      const disabled = screen.getByTestId('quick-buy-disabled-footer');
      // The CTA is the one live control — it must not inherit pointerEvents:none.
      expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
      expect(
        within(disabled).queryByTestId('quick-buy-confirm-button'),
      ).toBeNull();
    });
  });
});
