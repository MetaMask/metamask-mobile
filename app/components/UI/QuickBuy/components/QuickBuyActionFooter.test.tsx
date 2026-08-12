import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import QuickBuyActionFooter from './QuickBuyActionFooter';
import { useQuickBuyContext } from '../useQuickBuyContext';

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
  selectedDestStable: undefined,
  totalAmountFiat: '$123.75',
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

  it('renders the total row and navigates to quote details when pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
    });

    render(<QuickBuyActionFooter />);

    expect(
      screen.getByText('social_leaderboard.quick_buy.total'),
    ).toBeOnTheScreen();
    expect(screen.getByText('$123.75')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('quick-buy-rate-tag-pressable'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
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

      const disabled = screen.getByTestId('quick-buy-disabled-section');
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

      const disabled = screen.getByTestId('quick-buy-disabled-section');
      // The CTA is the one live control — it must not inherit pointerEvents:none.
      expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
      expect(
        within(disabled).queryByTestId('quick-buy-confirm-button'),
      ).toBeNull();
    });
  });
});
