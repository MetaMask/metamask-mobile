import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyToolbar from './QuickBuyToolbar';
import { useQuickBuyContext } from '../useQuickBuyContext';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const baseContext = {
  setActiveScreen: jest.fn(),
  onClose: jest.fn(),
  isQuickAmountPreferencesLoaded: true,
  features: {
    tradeModes: ['buy'] as ('buy' | 'sell')[],
    quickAmountPills: true,
  },
  tradeMode: 'buy' as const,
  setTradeMode: jest.fn(),
};

describe('QuickBuyToolbar', () => {
  const setActiveScreen = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
      onClose,
    });
  });

  it('shows a Buy title instead of the trade mode toggle when only buy mode is enabled', () => {
    render(<QuickBuyToolbar />);
    expect(screen.queryByTestId('quick-buy-trade-mode-toggle')).toBeNull();
    expect(screen.getByTestId('quick-buy-buy-only-title')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.quick_buy.buy_label'),
    ).toBeOnTheScreen();
  });

  it('shows a Buy title when sell is unavailable due to zero balance', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
      onClose,
      features: { tradeModes: ['buy', 'sell'], quickAmountPills: true },
      hasSellableBalance: false,
    });
    render(<QuickBuyToolbar />);
    expect(screen.queryByTestId('quick-buy-trade-mode-toggle')).toBeNull();
    expect(screen.getByTestId('quick-buy-buy-only-title')).toBeOnTheScreen();
  });

  it('renders the Buy/Sell toggle when both modes are enabled and sellable', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
      onClose,
      features: { tradeModes: ['buy', 'sell'], quickAmountPills: true },
      hasSellableBalance: true,
    });
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
    expect(screen.queryByTestId('quick-buy-buy-only-title')).toBeNull();
  });

  it('shows the edit quick amounts gear when quickAmountPills is enabled', () => {
    render(<QuickBuyToolbar />);
    expect(
      screen.getByTestId('quick-buy-edit-amounts-button'),
    ).toBeOnTheScreen();
  });

  it('hides the edit quick amounts gear when quickAmountPills is disabled', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
      onClose,
      features: { tradeModes: ['buy'], quickAmountPills: false },
    });
    render(<QuickBuyToolbar />);
    expect(screen.queryByTestId('quick-buy-edit-amounts-button')).toBeNull();
  });

  it('navigates to editQuickAmounts when the gear is pressed', () => {
    render(<QuickBuyToolbar />);
    fireEvent.press(screen.getByTestId('quick-buy-edit-amounts-button'));
    expect(setActiveScreen).toHaveBeenCalledWith('editQuickAmounts');
  });

  it('disables the gear while quick amount preferences are loading', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
      onClose,
      isQuickAmountPreferencesLoaded: false,
    });

    render(<QuickBuyToolbar />);

    expect(screen.getByTestId('quick-buy-edit-amounts-button')).toBeDisabled();
    fireEvent.press(screen.getByTestId('quick-buy-edit-amounts-button'));
    expect(setActiveScreen).not.toHaveBeenCalled();
  });

  it('calls onClose when the close button is pressed', () => {
    render(<QuickBuyToolbar />);
    fireEvent.press(screen.getByTestId('quick-buy-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
