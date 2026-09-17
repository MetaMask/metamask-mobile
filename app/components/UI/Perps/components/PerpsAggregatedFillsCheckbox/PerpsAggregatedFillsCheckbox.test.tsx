import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsAggregatedFillsCheckbox from './PerpsAggregatedFillsCheckbox';

const TEST_ID = 'aggregated-checkbox';

describe('PerpsAggregatedFillsCheckbox', () => {
  it('reports the checked state when selected', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsAggregatedFillsCheckbox
        isSelected
        onChange={jest.fn()}
        testID={TEST_ID}
      />,
    );

    expect(getByTestId(TEST_ID).props.accessibilityState).toEqual({
      checked: true,
    });
  });

  it('reports the unchecked state when not selected', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsAggregatedFillsCheckbox
        isSelected={false}
        onChange={jest.fn()}
        testID={TEST_ID}
      />,
    );

    expect(getByTestId(TEST_ID).props.accessibilityState).toEqual({
      checked: false,
    });
  });

  it('turns aggregation off when a selected pill is pressed', () => {
    const onChange = jest.fn();

    const { getByTestId } = renderWithProvider(
      <PerpsAggregatedFillsCheckbox
        isSelected
        onChange={onChange}
        testID={TEST_ID}
      />,
    );
    fireEvent.press(getByTestId(TEST_ID));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('turns aggregation on when an unselected pill is pressed', () => {
    const onChange = jest.fn();

    const { getByTestId } = renderWithProvider(
      <PerpsAggregatedFillsCheckbox
        isSelected={false}
        onChange={onChange}
        testID={TEST_ID}
      />,
    );
    fireEvent.press(getByTestId(TEST_ID));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
