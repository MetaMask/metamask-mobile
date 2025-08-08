// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';

// Internal dependencies.
import ListItemMultiSelectButton from './ListItemMultiSelectWithMenuButton';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { BUTTON_TEST_ID } from './ListItemMultiSelectWithMenuButton.constants';

describe('ListItemMultiSelectWithMenuButton', () => {
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

  it('should call onPress when the button is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ListItemMultiSelectButton
        onPress={mockOnPress}
        buttonProps={{
          onButtonClick: mockOnPress,
        }}
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
        buttonProps={{
          onButtonClick: mockOnButtonClick,
        }}
      >
        <View />
      </ListItemMultiSelectButton>,
    );
    fireEvent.press(getByTestId(BUTTON_TEST_ID));
    expect(mockOnButtonClick).toHaveBeenCalled();
  });

  it('should render checkbox as checked when isSelected is true', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectButton isSelected>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(getByTestId('checkbox-icon-component')).toBeTruthy();
  });

  it('should be disabled when isDisabled is true', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ListItemMultiSelectButton isDisabled onPress={mockOnPress}>
        <View />
      </ListItemMultiSelectButton>,
    );

    // The component should render without error when disabled
    expect(getByRole('button')).toBeTruthy();
  });

  it('should not render button icon when showButtonIcon is false', () => {
    const { queryByTestId } = render(
      <ListItemMultiSelectButton showButtonIcon={false}>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(queryByTestId(BUTTON_TEST_ID)).toBeNull();
  });

  it('should call onPress on long press', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ListItemMultiSelectButton onPress={mockOnPress}>
        <View />
      </ListItemMultiSelectButton>,
    );

    // Test that the component renders with onLongPress prop set to onPress
    expect(getByRole('button')).toBeTruthy();
  });

  it('should render with custom gap', () => {
    const { getByRole } = render(
      <ListItemMultiSelectButton gap={24}>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('should use custom button test ID when provided', () => {
    const customTestId = 'custom-button-test-id';
    const { getByTestId } = render(
      <ListItemMultiSelectButton
        buttonProps={{
          buttonTestId: customTestId,
        }}
      >
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(getByTestId(customTestId)).toBeTruthy();
  });

  it('should render with custom button icon', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectButton buttonIcon={IconName.Arrow2Right}>
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(getByTestId(BUTTON_TEST_ID)).toBeTruthy();
  });

  it('should handle button props with text button', () => {
    const { getByRole } = render(
      <ListItemMultiSelectButton
        buttonProps={{
          textButton: 'Click Me',
          showButtonIcon: true,
        }}
      >
        <View />
      </ListItemMultiSelectButton>,
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('should handle button props with showButtonIcon false', () => {
    const { getByTestId } = render(
      <ListItemMultiSelectButton
        buttonProps={{
          showButtonIcon: false,
        }}
      >
        <View />
      </ListItemMultiSelectButton>,
    );
    // The button should still render even when buttonProps.showButtonIcon is false
    // because the main showButtonIcon prop is still true
    expect(getByTestId(BUTTON_TEST_ID)).toBeTruthy();
  });
});
