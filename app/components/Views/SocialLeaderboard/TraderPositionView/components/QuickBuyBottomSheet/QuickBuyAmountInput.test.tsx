import React, { createRef } from 'react';
import { TextInput } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { Position } from '@metamask/social-controllers';
import QuickBuyAmountInput from './QuickBuyAmountInput';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const { mockTheme } = jest.requireActual('../../../../../../util/theme');
const mockColors = { text: { alternative: mockTheme.colors.text.alternative } };

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    chain: 'base',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    positionAmount: 1000,
    boughtUsd: 500,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 500,
    trades: [],
    lastTradeAt: 0,
    currentValueUSD: 900,
    pnlValueUsd: 400,
    pnlPercent: 80,
    ...overrides,
  }) as Position;

const defaultProps = {
  usdAmount: '',
  position: createPosition(),
  estimatedReceiveAmount: undefined,
  isQuoteLoading: false,
  hasValidAmount: false,
  hasError: false,
  hiddenInputRef: createRef<TextInput>(),
  onAmountAreaPress: jest.fn(),
  onAmountChange: jest.fn(),
  colors: mockColors,
};

describe('QuickBuyAmountInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('displays the USD amount ($0 when empty, entered value otherwise)', () => {
    const { rerender } = renderWithProvider(
      <QuickBuyAmountInput {...defaultProps} usdAmount="" />,
    );
    expect(screen.getByText('$0')).toBeOnTheScreen();

    rerender(<QuickBuyAmountInput {...defaultProps} usdAmount="20" />);
    expect(screen.getByText('$20')).toBeOnTheScreen();
  });

  it('shows "0 SYMBOL" as the receive estimate when there is no active quote', () => {
    renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        estimatedReceiveAmount={undefined}
      />,
    );

    expect(screen.getByText('0 PEPE')).toBeOnTheScreen();
  });

  it('shows the estimated receive amount from the active quote', () => {
    renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        usdAmount="20"
        hasValidAmount
        estimatedReceiveAmount="12345.67"
      />,
    );

    expect(screen.getByText('12345.67 PEPE')).toBeOnTheScreen();
  });

  it('shows a loading spinner while the quote is fetching', () => {
    renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        usdAmount="20"
        hasValidAmount
        isQuoteLoading
      />,
    );

    // ActivityIndicator does not have accessible text; verify the estimate text is hidden
    expect(screen.queryByText('0 PEPE')).not.toBeOnTheScreen();
  });

  it('shows the "no quotes" message when there is an error and a valid amount', () => {
    renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        usdAmount="20"
        hasValidAmount
        hasError
        estimatedReceiveAmount={undefined}
      />,
    );

    expect(
      screen.getByText('social_leaderboard.quick_buy.no_quotes'),
    ).toBeOnTheScreen();
  });

  it('calls onAmountAreaPress when the tappable area is pressed', () => {
    const onAmountAreaPress = jest.fn();

    renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        onAmountAreaPress={onAmountAreaPress}
      />,
    );

    fireEvent.press(screen.getByTestId('quick-buy-amount-area'));

    expect(onAmountAreaPress).toHaveBeenCalledTimes(1);
  });

  it('calls onAmountChange when the hidden input value changes', () => {
    const onAmountChange = jest.fn();

    renderWithProvider(
      <QuickBuyAmountInput {...defaultProps} onAmountChange={onAmountChange} />,
    );

    fireEvent.changeText(screen.getByTestId('quick-buy-amount-input'), '50');

    expect(onAmountChange).toHaveBeenCalledWith('50');
  });
});
