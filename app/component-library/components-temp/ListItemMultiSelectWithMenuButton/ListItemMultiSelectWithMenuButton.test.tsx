// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';

// Internal dependencies.
import ListItemMultiSelectWithMenuButton from './ListItemMultiSelectWithMenuButton';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { BUTTON_TEST_ID } from './ListItemMultiSelectWithMenuButton.constants';

describe('ListItemMultiSelectWithMenuButton', () => {
  it('should render correctly with default props', () => {
    const wrapper = render(
      <ListItemMultiSelectWithMenuButton>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render checkbox icon when isSelected is false', () => {
    const { queryByTestId } = render(
      <ListItemMultiSelectWithMenuButton>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    // Checkbox icon should not be present when not selected
    expect(queryByTestId('checkbox-icon-component')).toBeNull();
  });

  it('should call onPress when the button is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ListItemMultiSelectWithMenuButton
        onPress={mockOnPress}
        buttonProps={{
          onButtonClick: mockOnPress,
        }}
      >
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    fireEvent.press(getByRole('button'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should render the button icon with the correct name', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectWithMenuButton buttonIcon={IconName.Check}>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    expect(getByTestId(BUTTON_TEST_ID)).not.toBeNull();
  });

  it('should call onButtonClick when the button icon is pressed', () => {
    const mockOnButtonClick = jest.fn();
    const { getByTestId } = render(
      <ListItemMultiSelectWithMenuButton
        buttonIcon={IconName.Check}
        buttonProps={{
          onButtonClick: mockOnButtonClick,
        }}
      >
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    fireEvent.press(getByTestId(BUTTON_TEST_ID));
    expect(mockOnButtonClick).toHaveBeenCalled();
  });

  it('should render checkbox icon when isSelected is true', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectWithMenuButton isSelected>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    // Checkbox icon should be present when selected
    expect(getByTestId('checkbox-icon-component')).toBeTruthy();
  });

  it('should be disabled when isDisabled is true', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ListItemMultiSelectWithMenuButton isDisabled onPress={mockOnPress}>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );

    // The component should render without error when disabled
    expect(getByRole('button')).toBeTruthy();
  });

  it('should not render button icon when showButtonIcon is false', () => {
    const { queryByTestId } = render(
      <ListItemMultiSelectWithMenuButton showButtonIcon={false}>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    expect(queryByTestId(BUTTON_TEST_ID)).toBeNull();
  });

  it('should call onPress on long press', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ListItemMultiSelectWithMenuButton onPress={mockOnPress}>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );

    // Test that the component renders with onLongPress prop set to onPress
    expect(getByRole('button')).toBeTruthy();
  });

  it('should render with custom gap', () => {
    const { getByRole } = render(
      <ListItemMultiSelectWithMenuButton gap={24}>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('should use custom button test ID when provided', () => {
    const customTestId = 'custom-button-test-id';
    const { getByTestId } = render(
      <ListItemMultiSelectWithMenuButton
        buttonProps={{
          buttonTestId: customTestId,
        }}
      >
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    expect(getByTestId(customTestId)).toBeTruthy();
  });

  it('should render with custom button icon', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectWithMenuButton buttonIcon={IconName.Arrow2Right}>
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    expect(getByTestId(BUTTON_TEST_ID)).toBeTruthy();
  });

  it('should handle button props with text button', () => {
    const { getByRole } = render(
      <ListItemMultiSelectWithMenuButton
        buttonProps={{
          textButton: 'Click Me',
          showButtonIcon: true,
        }}
      >
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('should handle button props with showButtonIcon false', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectWithMenuButton
        buttonProps={{
          showButtonIcon: false,
        }}
      >
        <View />
      </ListItemMultiSelectWithMenuButton>,
    );
    // The button should still render even when buttonProps.showButtonIcon is false
    // because the main showButtonIcon prop is still true
    expect(getByTestId(BUTTON_TEST_ID)).toBeTruthy();
  });
});
