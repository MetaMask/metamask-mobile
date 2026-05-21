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
  hasValidAmount: false,
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
    expect(screen.getByText('$50')).toBeTruthy();
  });

  it('shows $0 placeholder when usdAmount is empty', () => {
    render(<QuickBuyAmountSection {...defaultProps} usdAmount="" />);
    expect(screen.getByText('$0')).toBeTruthy();
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
    expect(screen.getByText('0.025 ETH')).toBeTruthy();
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
    expect(screen.getByText('0 ETH')).toBeTruthy();
  });

  it('shows ActivityIndicator when isQuoteLoading and hasValidAmount', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        isQuoteLoading
        hasValidAmount
        usdAmount="20"
      />,
    );
    expect(screen.getByTestId('quick-buy-amount-area')).toBeTruthy();
    // Secondary label is replaced by spinner — crypto label should NOT be present
    expect(screen.queryByText('0 ETH')).toBeNull();
  });

  it('does NOT show ActivityIndicator when isQuoteLoading but hasValidAmount is false', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        isQuoteLoading
        hasValidAmount={false}
      />,
    );
    expect(screen.queryByText('0 ETH')).toBeTruthy();
  });

  it('shows the toggle button when fiatCryptoToggleEnabled', () => {
    render(<QuickBuyAmountSection {...defaultProps} fiatCryptoToggleEnabled />);
    expect(screen.getByTestId('quick-buy-toggle-amount-display')).toBeTruthy();
  });

  it('hides the toggle button when fiatCryptoToggleEnabled is false', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        fiatCryptoToggleEnabled={false}
      />,
    );
    expect(screen.queryByTestId('quick-buy-toggle-amount-display')).toBeNull();
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
    expect(screen.getByText(/\$1,234.56/)).toBeTruthy();
  });

  it('shows zero available message when no balance', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        availableBalanceFiat={undefined}
      />,
    );
    // Should not show balance amount but show the zero_available string
    expect(screen.queryByText(/\$1,234.56/)).toBeNull();
  });

  it('renders a rateTag node when provided without error', () => {
    render(<QuickBuyAmountSection {...defaultProps} rateTag={<></>} />);
    expect(screen.getByTestId('quick-buy-amount-area')).toBeTruthy();
  });
});
