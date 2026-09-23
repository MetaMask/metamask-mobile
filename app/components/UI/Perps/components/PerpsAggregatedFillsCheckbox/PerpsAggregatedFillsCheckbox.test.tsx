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
    expect(screen.getByTestId('aggregated-checkbox')).toHaveProp(
      'role',
      'checkbox',
    );
    expect(screen.getByTestId('aggregated-checkbox')).toHaveProp(
      'accessibilityState',
      { checked: true },
    );
    expect(
      screen.getByTestId('aggregated-checkbox-check-icon'),
    ).toBeOnTheScreen();
  });

  it('renders the unselected state without the check icon', () => {
    render(
      <PerpsAggregatedFillsCheckbox
        isSelected={false}
        onChange={jest.fn()}
        testID="aggregated-checkbox"
      />,
    );

    expect(screen.getByTestId('aggregated-checkbox')).toHaveProp(
      'accessibilityState',
      { checked: false },
    );
    expect(
      screen.queryByTestId('aggregated-checkbox-check-icon'),
    ).not.toBeOnTheScreen();
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

  it('selects when the unselected pill is pressed', () => {
    const onChange = jest.fn();

    render(
      <PerpsAggregatedFillsCheckbox
        isSelected={false}
        onChange={onChange}
        testID="aggregated-checkbox"
      />,
    );

    fireEvent.press(screen.getByTestId('aggregated-checkbox'));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
