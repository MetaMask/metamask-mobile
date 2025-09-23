import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsCandlePeriodSelector from './PerpsCandlePeriodSelector';
import { CandlePeriod } from '../../constants/chartConfig';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

const mockOnPeriodChange = jest.fn();
const mockOnMorePress = jest.fn();

describe('PerpsCandlePeriodSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default candle periods', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(
      <PerpsCandlePeriodSelector
        selectedPeriod={CandlePeriod.ONE_MINUTE}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    // Assert
    expect(getByText('1min')).toBeOnTheScreen();
    expect(getByText('3min')).toBeOnTheScreen();
    expect(getByText('5min')).toBeOnTheScreen();
    expect(getByText('15min')).toBeOnTheScreen();
  });

  it('calls onPeriodChange when period button is pressed', () => {
    // Arrange
    const { getByText } = renderWithProvider(
      <PerpsCandlePeriodSelector
        selectedPeriod={CandlePeriod.ONE_MINUTE}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    // Act
    fireEvent.press(getByText('3min'));

    // Assert
    expect(mockOnPeriodChange).toHaveBeenCalledWith(CandlePeriod.THREE_MINUTES);
  });

  it('calls onMorePress when more button is pressed', () => {
    // Arrange
    const testID = 'test-candle-selector';
    const { getByTestId } = renderWithProvider(
      <PerpsCandlePeriodSelector
        selectedPeriod={CandlePeriod.ONE_MINUTE}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
        testID={testID}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    // Act
    fireEvent.press(getByTestId(`${testID}-more-button`));

    // Assert
    expect(mockOnMorePress).toHaveBeenCalled();
  });

  it('displays selected period label in more button when non-default period is selected', () => {
    // Arrange
    const customPeriod = CandlePeriod.ONE_HOUR;

    // Act
    const { getByText } = renderWithProvider(
      <PerpsCandlePeriodSelector
        selectedPeriod={customPeriod}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    // Assert - Should show the custom period label instead of "show more"
    expect(getByText('1h')).toBeOnTheScreen();
  });
});
