// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';

// Internal dependencies.
import ListItemMultiSelectButton from './ListItemMultiSelectButton';
import { IconName } from '../../../component-library/components/Icons/Icon'; // Adjust the import path as necessary
import { BUTTON_TEST_ID } from './ListItemMultiSelectButton.constants';

describe('ListItemMultiSelectButton', () => {
  it('should render correctly with default props', () => {
    const wrapper = render(
      <ListItemMultiSelectButton>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the underlay view if isSelected is false', () => {
    const { queryByRole } = render(
      <ListItemMultiSelectButton>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the underlay view if isSelected is true', () => {
    const { queryByRole } = render(
      <ListItemMultiSelectButton isSelected>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(queryByRole('checkbox')).not.toBeNull();
  });

  it('should call onPress when the button is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ListItemMultiSelectButton
        onPress={mockOnPress}
        onButtonClick={mockOnPress}
      >
        <View />
      </ListItemMultiSelectButton>,
    );
    fireEvent.press(getByRole('button'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should render the button icon with the correct name', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectButton buttonIcon={IconName.Check}>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(getByTestId(BUTTON_TEST_ID)).not.toBeNull();
  });

  it('should call onButtonClick when the button icon is pressed', () => {
    const mockOnButtonClick = jest.fn();
    const { getByTestId } = render(
      <ListItemMultiSelectButton
        buttonIcon={IconName.Check}
        onButtonClick={mockOnButtonClick}
      >
        <View />
      </ListItemMultiSelectButton>,
    );
    fireEvent.press(getByTestId(BUTTON_TEST_ID));
    expect(mockOnButtonClick).toHaveBeenCalled();
  });
});
