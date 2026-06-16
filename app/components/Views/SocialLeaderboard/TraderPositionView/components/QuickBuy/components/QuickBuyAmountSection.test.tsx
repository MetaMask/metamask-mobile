import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import QuickBuyAmountSection from './QuickBuyAmountSection';

const defaultProps = {
  amountDisplayMode: 'fiat' as const,
  fiatAmountLabel: '$0',
  destSymbol: 'ETH',
  estimatedReceiveAmount: undefined,
  isQuoteLoading: false,
  hiddenInputRef: createRef<TextInput | null>(),
  onAmountAreaPress: jest.fn(),
  onAmountChange: jest.fn(),
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
        fiatAmountLabel="$50"
      />,
    );
    expect(screen.getByText('$50')).toBeOnTheScreen();
  });

  it('renders a non-USD preformatted fiat label as primary in fiat mode', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        amountDisplayMode="fiat"
        fiatAmountLabel="50 €"
      />,
    );
    expect(screen.getByText('50 €')).toBeOnTheScreen();
  });

  it('shows the zero placeholder label when no amount is entered', () => {
    render(<QuickBuyAmountSection {...defaultProps} fiatAmountLabel="$0" />);
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

  it('shows 0 crypto placeholder when estimatedCryptoAmount is undefined', () => {
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

  it('shows the estimated crypto amount with destSymbol as the secondary label', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        estimatedReceiveAmount="123.45"
        destSymbol="ETH"
      />,
    );
    expect(screen.getByText('123.45 ETH')).toBeOnTheScreen();
  });

  it('replaces the secondary label with an ActivityIndicator when isQuoteLoading', () => {
    render(
      <QuickBuyAmountSection
        {...defaultProps}
        isQuoteLoading
        fiatAmountLabel="$20"
      />,
    );
    expect(screen.getByTestId('quick-buy-amount-area')).toBeOnTheScreen();
    // Secondary label is replaced by spinner — crypto label should NOT be present
    expect(screen.queryByText('0 ETH')).not.toBeOnTheScreen();
  });

  it('shows the secondary label when NOT loading', () => {
    render(<QuickBuyAmountSection {...defaultProps} isQuoteLoading={false} />);
    expect(screen.getByText('0 ETH')).toBeOnTheScreen();
  });

  it('does not render a toggle button', () => {
    render(<QuickBuyAmountSection {...defaultProps} />);
    expect(
      screen.queryByTestId('quick-buy-toggle-amount-display'),
    ).not.toBeOnTheScreen();
  });

  it('does not render available balance text', () => {
    render(<QuickBuyAmountSection {...defaultProps} />);
    expect(screen.queryByText(/available/)).not.toBeOnTheScreen();
  });
});
