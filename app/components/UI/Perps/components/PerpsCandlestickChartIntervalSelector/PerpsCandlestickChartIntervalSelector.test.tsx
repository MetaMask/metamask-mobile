import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import ThemeProvider from '../../../../../component-library/providers/ThemeProvider/ThemeProvider';
import { getCandlestickChartSelector } from '../../Perps.testIds';
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
  const baseTestID = 'interval-selector';

  const { intervalButton } = getCandlestickChartSelector;

  const testIDs = {
    selector: baseTestID,
    interval1m: intervalButton(baseTestID, '1m'),
    interval5m: intervalButton(baseTestID, '5m'),
    interval15m: intervalButton(baseTestID, '15m'),
    interval30m: intervalButton(baseTestID, '30m'),
    interval1h: intervalButton(baseTestID, '1h'),
    interval2h: intervalButton(baseTestID, '2h'),
    interval4h: intervalButton(baseTestID, '4h'),
    interval8h: intervalButton(baseTestID, '8h'),
  };

  const defaultProps = {
    selectedInterval: '1h',
    onIntervalChange: mockOnIntervalChange,
    testID: baseTestID,
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
    expect(getByTestId(testIDs.selector)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval1m)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval5m)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval15m)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval30m)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval1h)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval2h)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval4h)).toBeOnTheScreen();
    expect(getByTestId(testIDs.interval8h)).toBeOnTheScreen();
  });

  it('calls onIntervalChange when interval button is pressed', () => {
    // Arrange
    const { getByTestId } = render(
      <TestWrapper>
        <PerpsCandlestickChartIntervalSelector {...defaultProps} />
      </TestWrapper>,
    );

    // Act
    fireEvent.press(getByTestId(testIDs.interval5m));

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
          testID={baseTestID}
        />
      </TestWrapper>,
    );

    // Act & Assert
    expect(() =>
      fireEvent.press(getByTestId(testIDs.interval1m)),
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
    expect(getByTestId(testIDs.interval1h)).toBeOnTheScreen();

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
    expect(getByTestId(testIDs.interval5m)).toBeOnTheScreen();
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
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '1m'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '5m'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '15m'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '30m'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '1h'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '2h'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '4h'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getCandlestickChartSelector.intervalButton(customTestID, '8h'),
      ),
    ).toBeOnTheScreen();
  });
});
