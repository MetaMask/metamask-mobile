import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsAmountDisplay from './PerpsAmountDisplay';
import { formatPrice } from '../../utils/formatUtils';

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        default: '#141618',
        alternative: '#9fa6ae',
      },
      primary: {
        default: '#037DD6',
      },
      warning: {
        default: '#ffd33d',
      },
    },
    themeAppearance: 'light',
  }),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((value, options) => {
    const num = parseFloat(value);
    if (options?.minimumDecimals === 0 && Number.isInteger(num)) {
      return `$${num}`;
    }
    return `$${value}`;
  }),
}));

describe('PerpsAmountDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with amount and max amount', () => {
    const { getByText } = render(
      <PerpsAmountDisplay amount="1000" maxAmount={5000} />,
    );

    expect(getByText('$1000')).toBeTruthy();
    expect(getByText('$5000 max')).toBeTruthy();
  });

  it('should render $0 when amount is empty', () => {
    const { getByText } = render(
      <PerpsAmountDisplay amount="" maxAmount={5000} />,
    );

    expect(getByText('$0')).toBeTruthy();
  });

  it('should show warning when showWarning is true', () => {
    const { getByText } = render(
      <PerpsAmountDisplay amount="1000" maxAmount={0} showWarning />,
    );

    expect(getByText('No funds available. Please deposit first.')).toBeTruthy();
  });

  it('should show custom warning message', () => {
    const customMessage = 'Insufficient balance';
    const { getByText } = render(
      <PerpsAmountDisplay
        amount="1000"
        maxAmount={5000}
        showWarning
        warningMessage={customMessage}
      />,
    );

    expect(getByText(customMessage)).toBeTruthy();
  });

  it('should be pressable when onPress is provided', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <PerpsAmountDisplay
        amount="1000"
        maxAmount={5000}
        onPress={onPressMock}
      />,
    );

    fireEvent.press(getByText('$1000'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should not be pressable when onPress is not provided', () => {
    const { getByText } = render(
      <PerpsAmountDisplay amount="1000" maxAmount={5000} />,
    );

    // This should not throw an error
    fireEvent.press(getByText('$1000'));
  });

  it('should show cursor when isActive is true', () => {
    const { getByTestId } = render(
      <PerpsAmountDisplay amount="1000" maxAmount={5000} isActive />,
    );

    // The cursor should be rendered when isActive is true
    expect(getByTestId('cursor')).toBeTruthy();
  });

  it('should not show cursor when isActive is false', () => {
    const { queryByTestId } = render(
      <PerpsAmountDisplay amount="1000" maxAmount={5000} isActive={false} />,
    );

    // The cursor should not be rendered when isActive is false
    expect(queryByTestId('cursor')).toBeNull();
  });

  it('should format prices correctly', () => {
    render(<PerpsAmountDisplay amount="1234.56" maxAmount={9876.54} />);

    expect(formatPrice).toHaveBeenCalledWith('1234.56', { minimumDecimals: 0 });
    expect(formatPrice).toHaveBeenCalledWith(9876.54);
  });
});
