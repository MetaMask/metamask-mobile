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
  formattedRate: undefined,
  formattedExchangeRate: '1 ETH = 1000 USDC',
  setActiveScreen: jest.fn(),
  features: { tradeModes: ['buy'] as ('buy' | 'sell')[] },
  tradeMode: 'buy' as const,
  setTradeMode: jest.fn(),
};

describe('QuickBuyToolbar', () => {
  const setActiveScreen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      formattedRate: undefined,
      formattedExchangeRate: '1 ETH = 1000 USDC',
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
    expect(
      screen.queryByText('social_leaderboard.quick_buy.buy_mode'),
    ).not.toBeOnTheScreen();
  });

  it('renders the Buy/Sell toggle when both modes are enabled', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
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
      setActiveScreen,
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

  it('shows formattedExchangeRate when no quote is available', () => {
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-rate-tag')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 1000 USDC')).toBeOnTheScreen();
  });

  it('prefers formattedRate (quote-based) over formattedExchangeRate when a quote is available', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      formattedRate: '1 SOL = 25,738.44 GIGA',
      formattedExchangeRate: '1 SOL = 23,529 GIGA',
      setActiveScreen,
    });

    render(<QuickBuyToolbar />);
    expect(screen.getByText('1 SOL = 25,738.44 GIGA')).toBeOnTheScreen();
    expect(screen.queryByText('1 SOL = 23,529 GIGA')).not.toBeOnTheScreen();
  });

  it('shows formattedRate even when formattedExchangeRate is undefined', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      formattedRate: '1 ETH = 4381.23 REPPO',
      formattedExchangeRate: undefined,
      setActiveScreen,
    });

    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-rate-tag')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 4381.23 REPPO')).toBeOnTheScreen();
  });

  it('hides the rate tag when both rates are undefined', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      formattedRate: undefined,
      formattedExchangeRate: undefined,
      setActiveScreen,
    });

    render(<QuickBuyToolbar />);
    expect(screen.queryByTestId('quick-buy-rate-tag')).not.toBeOnTheScreen();
  });

  it('navigates to quoteDetails screen when the rate tag is pressed', () => {
    render(<QuickBuyToolbar />);
    fireEvent.press(screen.getByTestId('quick-buy-rate-tag-pressable'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });
});
