import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import ThemeProvider from '../../../../../component-library/providers/ThemeProvider/ThemeProvider';
import PerpsCandlestickChartIntervalSelector from './PerpsCandlestickChartIntervalSelector';

const mockStore = configureMockStore();
const initialState = {
  user: {
    appTheme: 'light',
  },
};
const store = mockStore(initialState);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <ThemeProvider>{children}</ThemeProvider>
  </Provider>
);

describe('PerpsCandlestickChartIntervalSelector', () => {
  const mockOnIntervalChange = jest.fn();
  const defaultProps = {
    selectedInterval: '1h',
    onIntervalChange: mockOnIntervalChange,
    testID: 'interval-selector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all available intervals', () => {
    // Arrange
    const { getByTestId } = render(
      <TestWrapper>
        <PerpsCandlestickChartIntervalSelector {...defaultProps} />
      </TestWrapper>,
    );

    // Assert
    expect(getByTestId('interval-selector')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-1m')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-5m')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-15m')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-30m')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-1h')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-2h')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-4h')).toBeOnTheScreen();
    expect(getByTestId('interval-selector-8h')).toBeOnTheScreen();
  });

  it('calls onIntervalChange when interval button is pressed', () => {
    // Arrange
    const { getByTestId } = render(
      <TestWrapper>
        <PerpsCandlestickChartIntervalSelector {...defaultProps} />
      </TestWrapper>,
    );

    // Act
    fireEvent.press(getByTestId('interval-selector-5m'));

    // Assert
    expect(mockOnIntervalChange).toHaveBeenCalledWith('5m');
    expect(mockOnIntervalChange).toHaveBeenCalledTimes(1);
  });

  it('does not throw error when onIntervalChange is undefined', () => {
    // Arrange
    const { getByTestId } = render(
      <TestWrapper>
        <PerpsCandlestickChartIntervalSelector
          selectedInterval="1h"
          testID="interval-selector"
        />
      </TestWrapper>,
    );

    // Act & Assert
    expect(() =>
      fireEvent.press(getByTestId('interval-selector-1m')),
    ).not.toThrow();
  });

  it('displays correct interval selection state', () => {
    // Arrange
    const { getByTestId, rerender } = render(
      <TestWrapper>
        <PerpsCandlestickChartIntervalSelector {...defaultProps} />
      </TestWrapper>,
    );

    // Assert - Initially 1h is selected
    expect(getByTestId('interval-selector-1h')).toBeOnTheScreen();

    // Act - Update to select 5m
    rerender(
      <TestWrapper>
        <PerpsCandlestickChartIntervalSelector
          {...defaultProps}
          selectedInterval="5m"
        />
      </TestWrapper>,
    );

    // Assert - Now 5m should be selected
    expect(getByTestId('interval-selector-5m')).toBeOnTheScreen();
  });

  it('renders correct testID structure for each interval', () => {
    // Arrange
    const customTestID = 'custom-selector';
    const { getByTestId } = render(
      <TestWrapper>
        <PerpsCandlestickChartIntervalSelector
          selectedInterval="1h"
          testID={customTestID}
        />
      </TestWrapper>,
    );

    // Assert
    expect(getByTestId(`${customTestID}-1m`)).toBeOnTheScreen();
    expect(getByTestId(`${customTestID}-5m`)).toBeOnTheScreen();
    expect(getByTestId(`${customTestID}-15m`)).toBeOnTheScreen();
    expect(getByTestId(`${customTestID}-30m`)).toBeOnTheScreen();
    expect(getByTestId(`${customTestID}-1h`)).toBeOnTheScreen();
    expect(getByTestId(`${customTestID}-2h`)).toBeOnTheScreen();
    expect(getByTestId(`${customTestID}-4h`)).toBeOnTheScreen();
    expect(getByTestId(`${customTestID}-8h`)).toBeOnTheScreen();
  });
});
