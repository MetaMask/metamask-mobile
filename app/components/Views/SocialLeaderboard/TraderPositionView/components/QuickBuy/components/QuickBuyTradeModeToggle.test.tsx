import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { withSpring } from 'react-native-reanimated';
import QuickBuyTradeModeToggle from './QuickBuyTradeModeToggle';
import { useQuickBuyContext } from '../useQuickBuyContext';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    withSpring: jest.fn((value: number) => value),
  };
});

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('QuickBuyTradeModeToggle', () => {
  const setTradeMode = jest.fn();

  const renderToggle = (
    tradeMode: 'buy' | 'sell' = 'buy',
    hasSellableBalance = true,
  ) => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      tradeMode,
      setTradeMode,
      hasSellableBalance,
    });
    return render(<QuickBuyTradeModeToggle />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both Buy and Sell buttons', () => {
    renderToggle('buy');
    expect(screen.getByTestId('quick-buy-trade-mode-buy')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-trade-mode-sell')).toBeOnTheScreen();
  });

  it('renders locale-keyed labels', () => {
    renderToggle('buy');
    expect(
      screen.getByText('social_leaderboard.quick_buy.buy_label'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.quick_buy.sell_label'),
    ).toBeOnTheScreen();
  });

  it('calls setTradeMode("sell") when the Sell button is pressed in buy mode', () => {
    renderToggle('buy');
    fireEvent.press(screen.getByTestId('quick-buy-trade-mode-sell'));
    expect(setTradeMode).toHaveBeenCalledWith('sell');
  });

  it('calls setTradeMode("buy") when the Buy button is pressed in sell mode', () => {
    renderToggle('sell');
    fireEvent.press(screen.getByTestId('quick-buy-trade-mode-buy'));
    expect(setTradeMode).toHaveBeenCalledWith('buy');
  });

  it('does NOT call setTradeMode when pressing the already-active mode', () => {
    renderToggle('buy');
    fireEvent.press(screen.getByTestId('quick-buy-trade-mode-buy'));
    expect(setTradeMode).not.toHaveBeenCalled();
  });

  it('does NOT call setTradeMode when Sell is pressed without a sellable balance', () => {
    renderToggle('buy', false);
    fireEvent.press(screen.getByTestId('quick-buy-trade-mode-sell'));
    expect(setTradeMode).not.toHaveBeenCalled();
  });

  it('renders the wrapper with the correct testID', () => {
    renderToggle('buy');
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
  });

  const layoutBuyButton = (width = 80) =>
    fireEvent(screen.getByTestId('quick-buy-trade-mode-buy'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 32 } },
    });

  const layoutSellButton = (width = 72) =>
    fireEvent(screen.getByTestId('quick-buy-trade-mode-sell'), 'layout', {
      nativeEvent: { layout: { x: 80, y: 0, width, height: 32 } },
    });

  it('snaps the slider to the sell position without animating when mounted in sell mode', () => {
    renderToggle('sell');
    layoutBuyButton();
    layoutSellButton();

    expect(withSpring).not.toHaveBeenCalled();
  });

  it('animates the slider only after the initial placement when the trade mode changes', () => {
    const { rerender } = renderToggle('buy');
    layoutBuyButton();
    layoutSellButton();

    expect(withSpring).not.toHaveBeenCalled();

    (useQuickBuyContext as jest.Mock).mockReturnValue({
      tradeMode: 'sell',
      setTradeMode,
      hasSellableBalance: true,
    });
    rerender(<QuickBuyTradeModeToggle />);

    expect(withSpring).toHaveBeenCalledTimes(1);
  });

  it('renders only Buy with selected styling in buy-only mode', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      tradeMode: 'buy',
      setTradeMode,
      hasSellableBalance: false,
    });
    render(<QuickBuyTradeModeToggle buyOnly />);
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.quick_buy.buy_label'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-trade-mode-sell'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('quick-buy-trade-mode-buy'),
    ).not.toBeOnTheScreen();
  });
});
