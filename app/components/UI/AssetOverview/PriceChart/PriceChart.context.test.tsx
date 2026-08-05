import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, renderHook, fireEvent } from '@testing-library/react-native';
import { PriceChartProvider, usePriceChart } from './PriceChart.context';

type PriceChartContextValue = ReturnType<typeof usePriceChart>;

const TOGGLE_TEST_ID = 'toggle-chart-touch';

describe('PriceChart.context', () => {
  let renderedValues: PriceChartContextValue[] = [];

  const Consumer = () => {
    const value = usePriceChart();
    renderedValues.push(value);

    return (
      <TouchableOpacity
        testID={TOGGLE_TEST_ID}
        onPress={() => value.setIsChartBeingTouched(!value.isChartBeingTouched)}
      >
        <Text>{value.isChartBeingTouched ? 'touched' : 'idle'}</Text>
      </TouchableOpacity>
    );
  };

  beforeEach(() => {
    renderedValues = [];
  });

  describe('usePriceChart without a provider', () => {
    it('exposes an untouched chart by default', () => {
      const { result } = renderHook(() => usePriceChart());

      expect(result.current.isChartBeingTouched).toBe(false);
    });

    it('throws when the setter is called outside of a provider', () => {
      const { result } = renderHook(() => usePriceChart());

      expect(() => result.current.setIsChartBeingTouched(true)).toThrow(
        'setIsChartBeingTouched() was called but no PriceChartProvider was found in the component tree.',
      );
    });
  });

  describe('PriceChartProvider', () => {
    it('renders its children', () => {
      const { getByText } = render(
        <PriceChartProvider>
          <Text>chart</Text>
        </PriceChartProvider>,
      );

      expect(getByText('chart')).toBeTruthy();
    });

    it('keeps the context value reference stable across re-renders with unchanged state', () => {
      const { rerender } = render(
        <PriceChartProvider>
          <Consumer />
        </PriceChartProvider>,
      );

      rerender(
        <PriceChartProvider>
          <Consumer />
        </PriceChartProvider>,
      );

      expect(renderedValues).toHaveLength(2);
      expect(renderedValues[1]).toBe(renderedValues[0]);
    });

    it('gives consumers a new context value when the touch state changes', () => {
      const { getByTestId, getByText } = render(
        <PriceChartProvider>
          <Consumer />
        </PriceChartProvider>,
      );

      fireEvent.press(getByTestId(TOGGLE_TEST_ID));

      expect(getByText('touched')).toBeTruthy();
      const latestValue = renderedValues[renderedValues.length - 1];
      expect(latestValue.isChartBeingTouched).toBe(true);
      expect(latestValue).not.toBe(renderedValues[0]);
    });

    it('keeps the setter identity stable when the touch state changes', () => {
      const { getByTestId } = render(
        <PriceChartProvider>
          <Consumer />
        </PriceChartProvider>,
      );

      fireEvent.press(getByTestId(TOGGLE_TEST_ID));

      const latestValue = renderedValues[renderedValues.length - 1];
      expect(latestValue.setIsChartBeingTouched).toBe(
        renderedValues[0].setIsChartBeingTouched,
      );
    });
  });
});
