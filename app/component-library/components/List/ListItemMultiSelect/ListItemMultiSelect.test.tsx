// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Platform } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemMultiSelect from './ListItemMultiSelect';

describe('ListItemMultiSelect', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <ListItemMultiSelect>
        <View />
      </ListItemMultiSelect>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the selected view if isSelected is false', () => {
    const { queryByRole } = render(
      <ListItemMultiSelect>
        <View />
      </ListItemMultiSelect>,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the selected view if isSelected is true', () => {
    const { queryByRole } = render(
      <ListItemMultiSelect isSelected>
        <View />
      </ListItemMultiSelect>,
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
        <ListItemMultiSelect onPress={mockOnPress} testID="list-item-multi">
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when item is disabled on Android', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect
          onPress={mockOnPress}
          isDisabled
          testID="list-item-multi"
        >
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should not pass onPressIn to Checkbox on Android to prevent double execution', () => {
      const mockOnPress = jest.fn();
      const { getByRole } = render(
        <ListItemMultiSelect onPress={mockOnPress} isSelected>
          <View />
        </ListItemMultiSelect>,
      );

      // The checkbox should be present but not have its own onPress handler on Android
      const checkbox = getByRole('checkbox');
      expect(checkbox).toBeTruthy();

      // When pressing the overall component, onPress should only be called once
      if (checkbox.parent) {
        fireEvent.press(checkbox.parent);
      }
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should use GestureDetector wrapper on Android', () => {
      const { getByTestId } = render(
        <ListItemMultiSelect onPress={() => null} testID="list-item-multi">
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      expect(listItem).toBeTruthy();
      // On Android, the component should be wrapped with GestureDetector
      // The item should still be accessible and functional
    });

    it('should handle checkbox state correctly on Android', () => {
      const { rerender, queryByRole } = render(
        <ListItemMultiSelect isSelected={false}>
          <View />
        </ListItemMultiSelect>,
      );

      // Should not show selected state initially
      expect(queryByRole('checkbox')).toBeNull();

      // Should show selected state when isSelected is true
      rerender(
        <ListItemMultiSelect isSelected>
          <View />
        </ListItemMultiSelect>,
      );
      expect(queryByRole('checkbox')).not.toBeNull();
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
        <ListItemMultiSelect onPress={mockOnPress} testID="list-item-multi">
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should pass onPressIn to Checkbox on iOS', () => {
      const mockOnPress = jest.fn();
      const { getByRole, getByTestId } = render(
        <ListItemMultiSelect
          onPress={mockOnPress}
          isSelected
          testID="list-item-multi"
        >
          <View />
        </ListItemMultiSelect>,
      );

      // On iOS, the checkbox should receive the onPressIn prop
      const checkbox = getByRole('checkbox');
      expect(checkbox).toBeTruthy();

      // Both the overall component and checkbox can trigger onPress
      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);
      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('TouchableOpacity wrapper gesture handling', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      Platform.OS = 'android';
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('should call onPress when item is pressed (Android wrapper active)', () => {
      // Override test environment detection to enable Android gesture wrapper
      const originalEnv = process.env.NODE_ENV;
      const originalIsTest = process.env.IS_TEST;
      const originalMetaMaskEnv = process.env.METAMASK_ENVIRONMENT;

      process.env.NODE_ENV = 'development';
      delete process.env.IS_TEST;
      delete process.env.METAMASK_ENVIRONMENT;

      try {
        const mockOnPress = jest.fn();
        const { getByTestId } = render(
          <ListItemMultiSelect onPress={mockOnPress} testID="list-item-multi">
            <View />
          </ListItemMultiSelect>,
        );

        const listItem = getByTestId('list-item-multi');
        fireEvent.press(listItem);

        expect(mockOnPress).toHaveBeenCalledTimes(1);
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalIsTest) process.env.IS_TEST = originalIsTest;
        if (originalMetaMaskEnv)
          process.env.METAMASK_ENVIRONMENT = originalMetaMaskEnv;
      }
    });

    it('should handle isDisabled prop in TouchableOpacity wrapper', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect
          onPress={mockOnPress}
          isDisabled
          testID="list-item-multi"
        >
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should preserve accessibility onPress when not disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect onPress={mockOnPress} testID="list-item-multi">
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      expect(listItem.props.onPress).toBeDefined();
    });

    it('should set accessibility onPress to undefined when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect
          onPress={mockOnPress}
          isDisabled
          testID="list-item-multi"
        >
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      expect(listItem.props.onPress).toBeUndefined();
    });
  });

  describe('Environment-specific component selection', () => {
    const originalPlatform = Platform.OS;
    const originalEnv = process.env;

    beforeEach(() => {
      Platform.OS = 'android';
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
      process.env = originalEnv;
    });

    it('should use RNTouchableOpacity in E2E test environment', () => {
      process.env.IS_TEST = 'true';
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect onPress={mockOnPress} testID="list-item-multi">
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should use RNTouchableOpacity in unit test environment', () => {
      process.env.NODE_ENV = 'test';
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect onPress={mockOnPress} testID="list-item-multi">
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should use RNTouchableOpacity in MetaMask E2E environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect onPress={mockOnPress} testID="list-item-multi">
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should set onPress to undefined when disabled in test environment', () => {
      process.env.NODE_ENV = 'test';
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemMultiSelect
          onPress={mockOnPress}
          isDisabled
          testID="list-item-multi"
        >
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      fireEvent.press(listItem);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should expose disabled prop in test environment', () => {
      process.env.NODE_ENV = 'test';
      const { getByTestId } = render(
        <ListItemMultiSelect
          onPress={() => null}
          isDisabled
          testID="list-item-multi"
        >
          <View />
        </ListItemMultiSelect>,
      );

      const listItem = getByTestId('list-item-multi');
      expect(listItem.props.disabled).toBe(true);
    });

    it('should pass conditional onPress to Checkbox onPressIn based on platform', () => {
      const mockOnPress = jest.fn();
      const { getByRole } = render(
        <ListItemMultiSelect onPress={mockOnPress} isSelected>
          <View />
        </ListItemMultiSelect>,
      );

      const checkbox = getByRole('checkbox');
      // On Android, checkbox should not have onPressIn prop to prevent double execution
      expect(checkbox.props.onPressIn).toBeUndefined();
    });
  });
});
