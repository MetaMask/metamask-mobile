import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyRateRow from './QuickBuyRateRow';
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
  isPriceImpactError: false,
};

describe('QuickBuyRateRow', () => {
  const setActiveScreen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setActiveScreen,
    });
  });

  it('renders nothing when both rates are undefined and isPriceImpactError is false', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      formattedRate: undefined,
      formattedExchangeRate: undefined,
      setActiveScreen,
    });

    render(<QuickBuyRateRow />);
    expect(screen.queryByTestId('quick-buy-rate-row')).not.toBeOnTheScreen();
  });

  it('shows formattedExchangeRate when no quote is available', () => {
    render(<QuickBuyRateRow />);
    expect(screen.getByTestId('quick-buy-rate-row')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 1000 USDC')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.quick_buy.rate'),
    ).toBeOnTheScreen();
  });

  it('prefers formattedRate (quote-based) over formattedExchangeRate when a quote is available', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      formattedRate: '1 SOL = 25,738.44 GIGA',
      formattedExchangeRate: '1 SOL = 23,529 GIGA',
      setActiveScreen,
    });

    render(<QuickBuyRateRow />);
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

    render(<QuickBuyRateRow />);
    expect(screen.getByTestId('quick-buy-rate-row')).toBeOnTheScreen();
    expect(screen.getByText('1 ETH = 4381.23 REPPO')).toBeOnTheScreen();
  });

  it('navigates to quoteDetails screen when the rate row is pressed', () => {
    render(<QuickBuyRateRow />);
    fireEvent.press(screen.getByTestId('quick-buy-rate-row-pressable'));
    expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
  });

  describe('isPriceImpactError variant', () => {
    it('renders even when rate labels are undefined', () => {
      (useQuickBuyContext as jest.Mock).mockReturnValue({
        ...baseContext,
        formattedRate: undefined,
        formattedExchangeRate: undefined,
        isPriceImpactError: true,
        setActiveScreen,
      });

      render(<QuickBuyRateRow />);
      expect(screen.getByTestId('quick-buy-rate-row')).toBeOnTheScreen();
    });

    it('shows the bridge.price_impact_warning_title i18n key as text', () => {
      (useQuickBuyContext as jest.Mock).mockReturnValue({
        ...baseContext,
        isPriceImpactError: true,
        setActiveScreen,
      });

      render(<QuickBuyRateRow />);
      expect(
        screen.getByText('bridge.price_impact_warning_title'),
      ).toBeOnTheScreen();
    });

    it('still calls setActiveScreen when the row is tapped', () => {
      (useQuickBuyContext as jest.Mock).mockReturnValue({
        ...baseContext,
        isPriceImpactError: true,
        setActiveScreen,
      });

      render(<QuickBuyRateRow />);
      fireEvent.press(screen.getByTestId('quick-buy-rate-row-pressable'));
      expect(setActiveScreen).toHaveBeenCalledWith('quoteDetails');
    });
  });
});
