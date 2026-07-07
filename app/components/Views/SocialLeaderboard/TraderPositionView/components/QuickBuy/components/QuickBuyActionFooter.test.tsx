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

jest.mock('./QuickBuyTokenIcon', () => ({
  __esModule: true,
  default: () => null,
}));

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
  features: { payWithSheet: true },
  setActiveScreen: jest.fn(),
  formattedRate: undefined,
  formattedExchangeRate: '1 ETH = 1000 USDC',
  isPriceImpactError: false,
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

  it('renders the rate row when an exchange rate is available', () => {
    render(<QuickBuyActionFooter />);
    expect(screen.getByTestId('quick-buy-rate-row')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 1000 USDC')).toBeOnTheScreen();
  });

  it('hides the rate row when no rate is available', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      formattedRate: undefined,
      formattedExchangeRate: undefined,
    });
    render(<QuickBuyActionFooter />);
    expect(screen.queryByTestId('quick-buy-rate-row')).not.toBeOnTheScreen();
  });

  it('navigates to quoteDetails when the rate row is pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
    });
    render(<QuickBuyActionFooter />);
    fireEvent.press(screen.getByTestId('quick-buy-rate-row-pressable'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });

  it('shows price impact warning in the rate row when isPriceImpactError is true', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      isPriceImpactError: true,
    });
    render(<QuickBuyActionFooter />);
    expect(
      screen.getByText('bridge.price_impact_warning_title'),
    ).toBeOnTheScreen();
  });
});
