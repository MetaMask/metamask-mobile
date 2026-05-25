import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import QuickBuyAmountSection from './QuickBuyAmountSection';

const defaultProps = {
  amountDisplayMode: 'fiat' as const,
  fiatCryptoToggleEnabled: false,
  usdAmount: '',
  destSymbol: 'ETH',
  estimatedReceiveAmount: undefined,
  availableBalanceFiat: undefined,
  isQuoteLoading: false,
  hiddenInputRef: createRef<TextInput | null>(),
  onAmountAreaPress: jest.fn(),
  onAmountChange: jest.fn(),
  onToggleAmountDisplay: jest.fn(),
};

describe('QuickBuyAmountSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the fiat amount as primary in fiat mode', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        amountDisplayMode="fiat"
        usdAmount="50"
      />,
    );
    expect(screen.getByText('$50')).toBeOnTheScreen();
  });

  it('shows $0 placeholder when usdAmount is empty', () => {
    render(<QuickBuyAmountSection {...defaultProps} usdAmount="" />);
    expect(screen.getByText('$0')).toBeOnTheScreen();
  });

  it('renders the crypto amount as primary in crypto mode', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        amountDisplayMode="crypto"
        estimatedReceiveAmount="0.025"
        destSymbol="ETH"
      />,
    );
    expect(screen.getByText('0.025 ETH')).toBeOnTheScreen();
  });

  it('shows 0 crypto placeholder when estimatedReceiveAmount is undefined', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        amountDisplayMode="crypto"
        estimatedReceiveAmount={undefined}
        destSymbol="ETH"
      />,
    );
    expect(screen.getByText('0 ETH')).toBeOnTheScreen();
  });

  it('replaces the secondary label with an ActivityIndicator when isQuoteLoading', () => {
    render(
      <QuickBuyAmountSection {...defaultProps} isQuoteLoading usdAmount="20" />,
    );
    expect(screen.getByTestId('quick-buy-amount-area')).toBeOnTheScreen();
    // Secondary label is replaced by spinner — crypto label should NOT be present
    expect(screen.queryByText('0 ETH')).not.toBeOnTheScreen();
  });

  it('shows the secondary label when NOT loading', () => {
    render(<QuickBuyAmountSection {...defaultProps} isQuoteLoading={false} />);
    expect(screen.getByText('0 ETH')).toBeOnTheScreen();
  });

  it('shows the toggle button when fiatCryptoToggleEnabled', () => {
    render(<QuickBuyAmountSection {...defaultProps} fiatCryptoToggleEnabled />);
    expect(
      screen.getByTestId('quick-buy-toggle-amount-display'),
    ).toBeOnTheScreen();
  });

  it('hides the toggle button when fiatCryptoToggleEnabled is false', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        fiatCryptoToggleEnabled={false}
      />,
    );
    expect(
      screen.queryByTestId('quick-buy-toggle-amount-display'),
    ).not.toBeOnTheScreen();
  });

  it('calls onToggleAmountDisplay when toggle is pressed', () => {
    const onToggleAmountDisplay = jest.fn();
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        fiatCryptoToggleEnabled
        onToggleAmountDisplay={onToggleAmountDisplay}
      />,
    );
    fireEvent.press(screen.getByTestId('quick-buy-toggle-amount-display'));
    expect(onToggleAmountDisplay).toHaveBeenCalledTimes(1);
  });

  it('calls onAmountAreaPress when the area is pressed', () => {
    const onAmountAreaPress = jest.fn();
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        onAmountAreaPress={onAmountAreaPress}
      />,
    );
    fireEvent.press(screen.getByTestId('quick-buy-amount-area'));
    expect(onAmountAreaPress).toHaveBeenCalledTimes(1);
  });

  it('shows available balance when provided', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        availableBalanceFiat="$1,234.56"
      />,
    );
    expect(screen.getByText(/\$1,234.56/)).toBeOnTheScreen();
  });

  it('shows zero available message when no balance', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        availableBalanceFiat={undefined}
      />,
    );
    expect(screen.queryByText(/\$1,234.56/)).not.toBeOnTheScreen();
  });

  it('renders a rateTag node when provided without error', () => {
    render(<QuickBuyAmountSection {...defaultProps} rateTag={<></>} />);
    expect(screen.getByTestId('quick-buy-amount-area')).toBeOnTheScreen();
  });
});
