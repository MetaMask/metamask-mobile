import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import EarningsChartRangeSelector from './EarningsChartRangeSelector';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import type { EarningsRange } from './earningsHistory';

describe('EarningsChartRangeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders every supported range and marks the selected range', () => {
    const { getByLabelText } = renderWithProvider(
      <EarningsChartRangeSelector
        selectedRange="30D"
        onRangeChange={jest.fn()}
      />,
    );

    expect(
      getByLabelText('1W', { exact: false }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
    expect(
      getByLabelText('1M', { exact: false }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(getByLabelText('3M', { exact: false })).toBeOnTheScreen();
    expect(getByLabelText('6M', { exact: false })).toBeOnTheScreen();
    expect(getByLabelText('1Y', { exact: false })).toBeOnTheScreen();
  });

  it('uses the range selector test ID', () => {
    const { getByTestId } = renderWithProvider(
      <EarningsChartRangeSelector
        selectedRange="1W"
        onRangeChange={jest.fn()}
      />,
    );

    expect(
      getByTestId(MoneyEarningsViewTestIds.RANGE_SELECTOR),
    ).toBeOnTheScreen();
  });

  it('forwards the selected range when a button is pressed', () => {
    const onRangeChange = jest.fn<(range: EarningsRange) => void>();
    const { getByLabelText } = renderWithProvider(
      <EarningsChartRangeSelector
        selectedRange="30D"
        onRangeChange={onRangeChange}
      />,
    );

    fireEvent.press(getByLabelText('1Y', { exact: false }));

    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenCalledWith('1Y');
  });
});
