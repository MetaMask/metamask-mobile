import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AmountInput from './AmountInput';
import { StyleSheet, TouchableOpacity } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';
import { mockTheme } from '../../../../../util/theme';

const defaultState = {
  engine: {
    backgroundState,
  },
};

const mockProps = {
  label: 'Amount',
  amount: '100.50',
  currencyCode: 'USD',
  currencySymbol: '$',
};

const getAmountTextStyles = () =>
  screen
    .getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)
    .findAll(
      ({ props }) => StyleSheet.flatten(props.style)?.fontSize !== undefined,
    )
    .map(({ props }) => StyleSheet.flatten(props.style));

describe('AmountInput', () => {
  it('renders correctly', () => {
    renderWithProvider(<AmountInput {...mockProps} />, {
      state: defaultState,
    });

    expect(
      screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT),
    ).toHaveTextContent('$100.50');
  });

  it('renders correctly with currency selector', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput {...mockProps} onCurrencyPress={mockOnCurrencyPress} />,
      {
        state: defaultState,
      },
    );
    expect(screen.getByText('USD')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(<AmountInput {...mockProps} onPress={mockOnPress} />, {
      state: defaultState,
    });

    fireEvent.press(screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onCurrencyPress when currency is pressed', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput {...mockProps} onCurrencyPress={mockOnCurrencyPress} />,
      {
        state: defaultState,
      },
    );
    fireEvent.press(screen.getByText('USD'));
    expect(mockOnCurrencyPress).toHaveBeenCalledTimes(1);
  });

  it('renders loading state correctly', () => {
    renderWithProvider(<AmountInput {...mockProps} loading />, {
      state: defaultState,
    });
    expect(screen.queryByText('$100.50')).not.toBeOnTheScreen();
  });

  it('renders loading state correctly with currency selector', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput
        {...mockProps}
        onCurrencyPress={mockOnCurrencyPress}
        loading
      />,
      {
        state: defaultState,
      },
    );
    expect(screen.queryByText('USD')).not.toBeOnTheScreen();
  });

  it('shows live cursor when input is highlighted', () => {
    renderWithProvider(<AmountInput {...mockProps} highlighted />, {
      state: defaultState,
    });

    expect(
      screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT_CURSOR),
    ).toBeOnTheScreen();
  });

  it('does not show live cursor when input is not highlighted', () => {
    renderWithProvider(<AmountInput {...mockProps} />, {
      state: defaultState,
    });

    expect(
      screen.queryByTestId(BuildQuoteSelectors.AMOUNT_INPUT_CURSOR),
    ).not.toBeOnTheScreen();
  });

  it('keeps the currency symbol before the animated amount', () => {
    renderWithProvider(<AmountInput {...mockProps} />, {
      state: defaultState,
    });

    expect(
      screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT),
    ).toHaveTextContent('$100.50');
  });

  it('keeps the sell token symbol after the animated amount', () => {
    renderWithProvider(
      <AmountInput
        {...mockProps}
        amount="100.50 ETH"
        currencySymbol={undefined}
        highlighted
        tokenSymbol="ETH"
      />,
      {
        state: defaultState,
      },
    );

    expect(
      screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT),
    ).toHaveTextContent('100.50 ETH');
  });

  it('uses the base font size for short animated amounts', () => {
    renderWithProvider(<AmountInput {...mockProps} />, {
      state: defaultState,
    });

    const amountTextStyles = getAmountTextStyles();

    expect(amountTextStyles).not.toHaveLength(0);
    expect(amountTextStyles.every(({ fontSize }) => fontSize === 24)).toBe(
      true,
    );
  });

  it('scales long animated amounts without native fit-to-width', () => {
    renderWithProvider(
      <AmountInput {...mockProps} amount="12345678901234567.89" highlighted />,
      {
        state: defaultState,
      },
    );

    const amountInput = screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
    const cursor = screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT_CURSOR);
    const amountTextStyles = getAmountTextStyles();
    const fitToWidthNodes = amountInput.findAll(
      ({ props }) => props.adjustsFontSizeToFit !== undefined,
    );

    expect(amountTextStyles).not.toHaveLength(0);
    expect(amountTextStyles.every(({ fontSize }) => fontSize === 12)).toBe(
      true,
    );
    expect(fitToWidthNodes).toHaveLength(0);
    expect(StyleSheet.flatten(cursor.props.style).height).toBe(12);
  });

  it('uses the error color for animated amount glyphs', () => {
    renderWithProvider(
      <AmountInput {...mockProps} amount="9" highlightedError />,
      {
        state: defaultState,
      },
    );

    const amountTextStyles = getAmountTextStyles();

    expect(amountTextStyles).not.toHaveLength(0);
    expect(
      amountTextStyles.every(
        ({ color }) => color === mockTheme.colors.error.default,
      ),
    ).toBe(true);
  });

  it('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(
      <AmountInput {...mockProps} onPress={mockOnPress} loading />,
      {
        state: defaultState,
      },
    );

    const pressableElements = screen.root.findAllByType(
      TouchableOpacity as never,
    );
    if (pressableElements.length > 0) {
      fireEvent.press(pressableElements[0]);
    }

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('does not call onCurrencyPress when loading', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput
        {...mockProps}
        onCurrencyPress={mockOnCurrencyPress}
        loading
      />,
      {
        state: defaultState,
      },
    );

    const pressableElements = screen.root.findAllByType(
      TouchableOpacity as never,
    );
    pressableElements.forEach((pressableElement) => {
      fireEvent.press(pressableElement);
    });

    expect(mockOnCurrencyPress).not.toHaveBeenCalled();
  });
});
