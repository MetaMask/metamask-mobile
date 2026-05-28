import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuickBuyToolbar from './QuickBuyToolbar';
import { useQuickBuyContext } from '../useQuickBuyContext';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('QuickBuyToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      formattedExchangeRate: '1 ETH = 1000 USDC',
    });
  });

  it('renders the buy mode label', () => {
    render(<QuickBuyToolbar />);
    expect(
      screen.getByText('social_leaderboard.quick_buy.buy_mode'),
    ).toBeOnTheScreen();
  });

  it('renders the exchange rate tag when available', () => {
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-rate-tag')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 1000 USDC')).toBeOnTheScreen();
  });

  it('hides the rate tag when exchange rate is undefined', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      formattedExchangeRate: undefined,
    });

    render(<QuickBuyToolbar />);
    expect(screen.queryByTestId('quick-buy-rate-tag')).not.toBeOnTheScreen();
  });
});
