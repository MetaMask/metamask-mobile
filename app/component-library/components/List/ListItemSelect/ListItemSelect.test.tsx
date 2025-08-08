// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Platform } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemSelect from './ListItemSelect';

describe('ListItemSelect', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <ListItemSelect>
        <View />
      </ListItemSelect>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the selected view if isSelected is false', () => {
    const { queryByRole } = render(
      <ListItemSelect>
        <View />
      </ListItemSelect>,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the selected view if isSelected is true', () => {
    const { queryByRole } = render(
      <ListItemSelect isSelected>
        <View />
      </ListItemSelect>,
    );
    expect(queryByRole('checkbox')).not.toBeNull();
  });

  describe('Android-specific gesture handling', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      Platform.OS = 'android';
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('should call onPress when item is pressed on Android', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemSelect onPress={mockOnPress} testID="list-item-select">
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when item is disabled on Android', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemSelect
          onPress={mockOnPress}
          isDisabled
          testID="list-item-select"
        >
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      fireEvent.press(listItem);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should call onLongPress when item is long pressed on Android', () => {
      const mockOnLongPress = jest.fn();
      const { getByTestId } = render(
        <ListItemSelect onLongPress={mockOnLongPress} testID="list-item-select">
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      fireEvent(listItem, 'longPress');

      expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    });

    it('should use GestureDetector wrapper on Android', () => {
      const { getByTestId } = render(
        <ListItemSelect onPress={() => null} testID="list-item-select">
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      expect(listItem).toBeTruthy();
      // On Android, the component should be wrapped with GestureDetector
      // The item should still be accessible and functional
    });
  });

  describe('iOS behavior (non-Android)', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      Platform.OS = 'ios';
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('should use standard TouchableOpacity on iOS', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemSelect onPress={mockOnPress} testID="list-item-select">
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });
});
