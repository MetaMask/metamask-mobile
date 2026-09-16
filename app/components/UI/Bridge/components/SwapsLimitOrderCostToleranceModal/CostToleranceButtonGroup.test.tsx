import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CostToleranceButtonGroup } from './CostToleranceButtonGroup';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';

describe('CostToleranceButtonGroup', () => {
  it('renders a button per option', () => {
    const { getByText, getByTestId } = render(
      <CostToleranceButtonGroup
        options={[
          { id: 'auto', label: 'Auto', selected: true, onPress: jest.fn() },
          { id: '2', label: '2%', onPress: jest.fn() },
        ]}
      />,
    );

    expect(
      getByTestId(SwapsLimitOrderCostToleranceModalSelectorsIDs.BUTTON_GROUP),
    ).toBeOnTheScreen();
    expect(getByText('Auto')).toBeOnTheScreen();
    expect(getByText('2%')).toBeOnTheScreen();
  });

  it('calls the option handler when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <CostToleranceButtonGroup
        options={[{ id: '2', label: '2%', onPress }]}
      />,
    );

    fireEvent.press(
      getByTestId(SwapsLimitOrderCostToleranceModalSelectorsIDs.OPTION('2')),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders no buttons when there are no options', () => {
    const { getByTestId, queryByRole } = render(
      <CostToleranceButtonGroup options={[]} />,
    );

    expect(
      getByTestId(SwapsLimitOrderCostToleranceModalSelectorsIDs.BUTTON_GROUP),
    ).toBeOnTheScreen();
    expect(queryByRole('button')).toBeNull();
  });
});
