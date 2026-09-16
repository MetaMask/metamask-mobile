import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsAggregatedFillsCheckbox from './PerpsAggregatedFillsCheckbox';

describe('PerpsAggregatedFillsCheckbox', () => {
  it('renders the Aggregated label and selected state', () => {
    render(
      <PerpsAggregatedFillsCheckbox
        isSelected
        onChange={jest.fn()}
        testID="aggregated-checkbox"
      />,
    );

    expect(
      screen.getByText(strings('perps.transactions.aggregated')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('aggregated-checkbox')).toBeOnTheScreen();
  });

  it('calls onChange with the next selected value when pressed', () => {
    const onChange = jest.fn();

    render(
      <PerpsAggregatedFillsCheckbox
        isSelected
        onChange={onChange}
        testID="aggregated-checkbox"
      />,
    );

    fireEvent.press(screen.getByTestId('aggregated-checkbox'));

    expect(onChange).toHaveBeenCalledWith(false);
  });
});
