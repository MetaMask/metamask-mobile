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
  onClose: jest.fn(),
  features: { tradeModes: ['buy'] as ('buy' | 'sell')[] },
  tradeMode: 'buy' as const,
  setTradeMode: jest.fn(),
};

describe('QuickBuyToolbar', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      onClose,
    });
  });

  it('renders buy-only toggle styling when only buy mode is enabled', () => {
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.quick_buy.buy_label'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-trade-mode-sell'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText('social_leaderboard.quick_buy.buy_mode'),
    ).not.toBeOnTheScreen();
  });

  it('renders the Buy/Sell toggle when both modes are enabled', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      onClose,
      features: { tradeModes: ['buy', 'sell'] },
      hasSellableBalance: true,
    });
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
    expect(
      screen.queryByText('social_leaderboard.quick_buy.buy_mode'),
    ).not.toBeOnTheScreen();
  });

  it('renders buy-only toggle when sell is enabled but there is no sellable balance', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      onClose,
      features: { tradeModes: ['buy', 'sell'] },
      hasSellableBalance: false,
    });
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.quick_buy.buy_label'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-trade-mode-sell'),
    ).not.toBeOnTheScreen();
  });

  it('renders the close button', () => {
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-close-button')).toBeOnTheScreen();
  });

  it('calls onClose when the close button is pressed', () => {
    render(<QuickBuyToolbar />);
    fireEvent.press(screen.getByTestId('quick-buy-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
