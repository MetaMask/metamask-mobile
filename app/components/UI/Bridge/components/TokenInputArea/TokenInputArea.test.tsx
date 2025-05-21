import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { TokenInputArea, TokenInputAreaType, calculateFontSize, getDisplayedAmount } from '.';
import { initialState } from '../../_mocks_/initialState';

const mockOnTokenPress = jest.fn();
const mockOnFocus = jest.fn();
const mockOnBlur = jest.fn();
const mockOnInputPress = jest.fn();

describe('TokenInputArea', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state', () => {
    const { getByTestId } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          onTokenPress={mockOnTokenPress}
          onFocus={mockOnFocus}
          onBlur={mockOnBlur}
          onInputPress={mockOnInputPress}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    expect(getByTestId('token-input-input')).toBeTruthy();
  });

  it('handles input focus and blur correctly', () => {
    const { getByTestId } = renderScreen(
      () => (
        <TokenInputArea
          testID="token-input"
          tokenType={TokenInputAreaType.Source}
          onFocus={mockOnFocus}
          onBlur={mockOnBlur}
        />
      ),
      {
        name: 'TokenInputArea',
      },
      { state: initialState },
    );

    const input = getByTestId('token-input-input');
    fireEvent(input, 'focus');
    expect(mockOnFocus).toHaveBeenCalled();

    fireEvent(input, 'blur');
    expect(mockOnBlur).toHaveBeenCalled();
  });
});

describe('calculateFontSize', () => {
  it('returns 40 for lengths up to 10', () => {
    expect(calculateFontSize(5)).toBe(40);
    expect(calculateFontSize(10)).toBe(40);
  });

  it('returns 35 for lengths between 11 and 15', () => {
    expect(calculateFontSize(11)).toBe(35);
    expect(calculateFontSize(15)).toBe(35);
  });

  it('returns 30 for lengths between 16 and 20', () => {
    expect(calculateFontSize(16)).toBe(30);
    expect(calculateFontSize(20)).toBe(30);
  });

  it('returns 25 for lengths between 21 and 25', () => {
    expect(calculateFontSize(21)).toBe(25);
    expect(calculateFontSize(25)).toBe(25);
  });

  it('returns 20 for lengths greater than 25', () => {
    expect(calculateFontSize(26)).toBe(20);
    expect(calculateFontSize(100)).toBe(20);
  });
});

describe('getDisplayedAmount', () => {
  it('returns undefined for undefined input', () => {
    expect(getDisplayedAmount(undefined)).toBeUndefined();
  });

  it('returns full amount for source type when under max length', () => {
    const amount = '123456789012345678';
    expect(getDisplayedAmount(amount, TokenInputAreaType.Source)).toBe(amount);
  });

  it('truncates amount for source type when over max length', () => {
    const amount = '1234567890123456789';
    expect(getDisplayedAmount(amount, TokenInputAreaType.Source)).toBe('123456789012345678');
  });

  it('parses and truncates amount for destination type', () => {
    const amount = '1234567890123456789.12345';
    expect(getDisplayedAmount(amount, TokenInputAreaType.Destination)).toBe('123456789012345678');
  });
});
