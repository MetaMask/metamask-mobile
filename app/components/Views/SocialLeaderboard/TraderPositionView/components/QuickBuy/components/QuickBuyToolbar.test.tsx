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
  features: {
    tradeModes: ['buy'] as ('buy' | 'sell')[],
    quickAmountPills: true,
  },
  tradeMode: 'buy' as const,
  setTradeMode: jest.fn(),
};

describe('QuickBuyToolbar', () => {
  const setActiveScreen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
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
  });

  it('renders the Buy/Sell toggle when both modes are enabled', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
      features: { tradeModes: ['buy', 'sell'], quickAmountPills: true },
      hasSellableBalance: true,
    });
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
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
});
