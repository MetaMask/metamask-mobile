// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';

// Internal dependencies.
import ListItemMultiSelectButton from './ListItemMultiSelectButton';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  BUTTON_TEST_ID,
  ROW_TEST_ID,
} from './ListItemMultiSelectButton.constants';

describe('ListItemMultiSelectButton', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectButton>
        <View />
      </ListItemMultiSelectButton>,
    );

    expect(getByTestId(ROW_TEST_ID)).toBeOnTheScreen();
  });

  it('exposes accessibilityRole="button" on the row', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectButton>
        <View />
      </ListItemMultiSelectButton>,
    );

    expect(getByTestId(ROW_TEST_ID).props.accessibilityRole).toBe('button');
  });

  it('calls onPress when the button is pressed', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ListItemMultiSelectButton
        onPress={mockOnPress}
        buttonProps={{ onButtonClick: mockOnPress }}
      >
        <View />
      </ListItemMultiSelectButton>,
    );

    fireEvent.press(getByTestId(ROW_TEST_ID));

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('renders the button icon when buttonIcon is provided', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectButton buttonIcon={IconName.Check}>
        <View />
      </ListItemMultiSelectButton>,
    );

    expect(getByTestId(BUTTON_TEST_ID)).toBeOnTheScreen();
  });

  it('calls onButtonClick when the button icon is pressed', () => {
    const mockOnButtonClick = jest.fn();

    const { getByTestId } = render(
      <ListItemMultiSelectButton
        buttonIcon={IconName.Check}
        buttonProps={{ onButtonClick: mockOnButtonClick }}
      >
        <View />
      </ListItemMultiSelectButton>,
    );

    fireEvent.press(getByTestId(BUTTON_TEST_ID));

    expect(mockOnButtonClick).toHaveBeenCalled();
  });
});
