import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyActionFooter from './QuickBuyActionFooter';
import { useQuickBuyContext } from '../useQuickBuyContext';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./QuickBuyPercentageSlider', () => ({
  QuickBuyPercentageSlider: () => null,
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
  sliderPercent: 0,
  isSliderDisabled: false,
  handleSliderChange: jest.fn(),
  handleSliderDragEnd: jest.fn(),
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
  formattedRate: undefined,
  formattedExchangeRate: '1 ETH = 1000 USDC',
  isPriceImpactError: false,
  features: { payWithSheet: true, quoteDetails: true },
  setActiveScreen: jest.fn(),
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

  it('renders the rate row and navigates to quote details when pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
    });

    render(<QuickBuyActionFooter />);

    expect(
      screen.getByText('social_leaderboard.quick_buy.rate'),
    ).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 1000 USDC')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('quick-buy-rate-tag-pressable'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });
});
