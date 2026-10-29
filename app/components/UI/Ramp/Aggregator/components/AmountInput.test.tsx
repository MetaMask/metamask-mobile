import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AmountInput, { getAggregatorAmountFontSize } from './AmountInput';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { TextColor } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

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

describe('getAggregatorAmountFontSize', () => {
  it('keeps short values at 24px', () => {
    const result = getAggregatorAmountFontSize(8);

    expect(result).toBe(24);
  });

  it('scales long values below 24px', () => {
    const result = getAggregatorAmountFontSize(20);

    expect(result).toBeLessThan(24);
  });
});

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

  it('keeps short animated amounts at 24px', () => {
    renderWithProvider(<AmountInput {...mockProps} />, {
      state: defaultState,
    });

    const amountTextStyles = getAmountTextStyles();

    expect(amountTextStyles).not.toHaveLength(0);
    expect(amountTextStyles.every(({ fontSize }) => fontSize === 24)).toBe(
      true,
    );
  });

  it('scales long animated amounts and its cursor', () => {
    const amount = '12345678901234567.89';
    renderWithProvider(
      <AmountInput {...mockProps} amount={amount} highlighted />,
      {
        state: defaultState,
      },
    );

    const amountTextStyles = getAmountTextStyles();
    const expectedFontSize = getAggregatorAmountFontSize(`$${amount}`.length);

    expect(amountTextStyles).not.toHaveLength(0);
    expect(
      amountTextStyles.every(({ fontSize }) => fontSize === expectedFontSize),
    ).toBe(true);
    expect(
      StyleSheet.flatten(
        screen.getByTestId(BuildQuoteSelectors.AMOUNT_INPUT_CURSOR).props.style,
      ).height,
    ).toBe(expectedFontSize);
  });

  it('uses the error color for animated amount glyphs', () => {
    renderWithProvider(
      <AmountInput {...mockProps} amount="9" highlightedError />,
      {
        state: defaultState,
      },
    );

    const errorColorNodes = screen
      .getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)
      .findAll(({ props }) => props.color === TextColor.ErrorDefault);

    expect(errorColorNodes.length).toBeGreaterThan(0);
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
