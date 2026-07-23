import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuickBuyActionFooter from './QuickBuyActionFooter';
import { useQuickBuyContext } from '../useQuickBuyContext';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./QuickBuyPercentageSlider', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    QuickBuyPercentageSlider: () =>
      ReactMock.createElement(Text, { testID: 'quick-buy-slider' }),
  };
});

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
  useKeyboard: false,
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
      features: { payWithSheet: true, quickAmountPills: true },
    });
    render(<QuickBuyActionFooter />);
    expect(screen.getByTestId('quick-buy-quick-amounts')).toBeOnTheScreen();
  });

  it('hides quick-amount pills when the feature flag is disabled', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      features: { payWithSheet: true, quickAmountPills: false },
    });
    render(<QuickBuyActionFooter />);
    expect(screen.queryByTestId('quick-buy-quick-amounts')).toBeNull();
  });

  it('renders the slider on the control variant', () => {
    render(<QuickBuyActionFooter />);
    expect(screen.getByTestId('quick-buy-slider')).toBeOnTheScreen();
  });

  it('hides the slider on the keyboard treatment', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      useKeyboard: true,
    });
    render(<QuickBuyActionFooter />);
    expect(screen.queryByTestId('quick-buy-slider')).toBeNull();
  });

  it('keeps footer mounted but non-interactive while the keypad is open on the treatment', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      useKeyboard: true,
      isKeypadOpen: true,
      features: { payWithSheet: true, quickAmountPills: true },
    });

    render(<QuickBuyActionFooter />);

    expect(screen.getByTestId('quick-buy-footer-reveal')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-pay-with-button')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-quick-amounts')).toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-footer-reveal-content').props.pointerEvents,
    ).toBe('none');
  });
});
