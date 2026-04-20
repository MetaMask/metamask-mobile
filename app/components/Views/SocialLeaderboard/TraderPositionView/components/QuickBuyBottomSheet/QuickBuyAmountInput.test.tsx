import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { Position } from '@metamask/social-controllers';
import QuickBuyAmountInput from './QuickBuyAmountInput';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockPosition = {
  tokenSymbol: 'BTC',
} as unknown as Position;

const { mockTheme } = jest.requireActual('../../../../../../util/theme');
const mockColors = { text: { alternative: mockTheme.colors.text.alternative } };

const createHiddenInputRef = () =>
  React.createRef<TextInput>() as unknown as React.RefObject<TextInput>;

const defaultProps = {
  usdAmount: '',
  position: mockPosition,
  estimatedReceiveAmount: undefined as string | undefined,
  isQuoteLoading: false,
  hasValidAmount: false,
  hasError: false,
  hiddenInputRef: createHiddenInputRef(),
  onAmountAreaPress: jest.fn(),
  onAmountChange: jest.fn(),
  colors: mockColors,
};

describe('QuickBuyAmountInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the zero state when no amount has been entered', () => {
    const { UNSAFE_queryByType } = renderWithProvider(
      <QuickBuyAmountInput {...defaultProps} />,
    );
    const { ActivityIndicator } = jest.requireActual('react-native');

    expect(screen.getByText('$0')).toBeOnTheScreen();
    expect(screen.getByText('0 BTC')).toBeOnTheScreen();
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it('renders the entered USD amount', () => {
    renderWithProvider(
      <QuickBuyAmountInput {...defaultProps} usdAmount="50" />,
    );

    expect(screen.getByText('$50')).toBeOnTheScreen();
  });

  it('shows a loading spinner while fetching a quote for a valid amount', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        usdAmount="50"
        isQuoteLoading
        hasValidAmount
      />,
    );

    const { ActivityIndicator } = jest.requireActual('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.queryByText('0 BTC')).toBeNull();
  });

  it('renders the estimated receive amount with the token symbol', () => {
    renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        usdAmount="50"
        estimatedReceiveAmount="1.23"
        hasValidAmount
      />,
    );

    expect(screen.getByText('1.23 BTC')).toBeOnTheScreen();
  });

  it('renders the no-quotes error when hasError is true without a receive amount', () => {
    renderWithProvider(
      <QuickBuyAmountInput
        {...defaultProps}
        usdAmount="50"
        hasValidAmount
        hasError
      />,
    );

    expect(
      screen.getByText('social_leaderboard.quick_buy.no_quotes'),
    ).toBeOnTheScreen();
  });

  it('fires onAmountAreaPress when the amount area is tapped', () => {
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

  it('fires onAmountChange when typing into the hidden input', () => {
    const onAmountChange = jest.fn();
    renderWithProvider(
      <QuickBuyAmountInput {...defaultProps} onAmountChange={onAmountChange} />,
    );

    fireEvent.changeText(screen.getByTestId('quick-buy-amount-input'), '42');
    expect(onAmountChange).toHaveBeenCalledWith('42');
  });
});
