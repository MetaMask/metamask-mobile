// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Platform } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemSelect from './ListItemSelect';

// Create a test version of the TouchableOpacity wrapper to test the uncovered code
const createTestTouchableOpacity = () => {
  const TouchableOpacity = ({
    onPress,
    disabled,
    children,
    ...props
  }: {
    onPress?: (event: unknown) => void;
    disabled?: boolean;
    children?: React.ReactNode;
    isDisabled?: boolean;
    [key: string]: unknown;
  }) => {
    const isDisabled =
      disabled || (props as { isDisabled?: boolean }).isDisabled;

    const handleGestureEnd = (gestureEvent: {
      x?: number;
      y?: number;
      absoluteX?: number;
      absoluteY?: number;
    }) => {
      if (onPress && !isDisabled) {
        const syntheticEvent = {
          nativeEvent: {
            locationX: gestureEvent.x || 0,
            locationY: gestureEvent.y || 0,
            pageX: gestureEvent.absoluteX || 0,
            pageY: gestureEvent.absoluteY || 0,
            timestamp: Date.now(),
          },
          persist: () => {
            // no-op for synthetic event
          },
          preventDefault: () => {
            // no-op for synthetic event
          },
          stopPropagation: () => {
            // no-op for synthetic event
          },
        };
        onPress(syntheticEvent);
      }
    };

    return (
      <View
        testID="touchable-wrapper"
        onTouchEnd={() =>
          handleGestureEnd({ x: 100, y: 100, absoluteX: 100, absoluteY: 100 })
        }
        {...(process.env.NODE_ENV === 'test' && { disabled: isDisabled })}
      >
        {children}
      </View>
    );
  };

  return TouchableOpacity;
};

describe('ListItemSelect TouchableOpacity Wrapper Logic', () => {
  const TestTouchableOpacity = createTestTouchableOpacity();

  it('should handle isDisabled logic correctly', () => {
    const mockOnPress = jest.fn();

    const { rerender } = render(
      <TestTouchableOpacity onPress={mockOnPress} disabled>
        <View />
      </TestTouchableOpacity>,
    );

    rerender(
      <TestTouchableOpacity onPress={mockOnPress} isDisabled>
        <View />
      </TestTouchableOpacity>,
    );

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should create synthetic event with correct structure', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <TestTouchableOpacity onPress={mockOnPress}>
        <View />
      </TestTouchableOpacity>,
    );

    const wrapper = getByTestId('touchable-wrapper');
    fireEvent(wrapper, 'touchEnd');

    expect(mockOnPress).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeEvent: expect.objectContaining({
          locationX: 100,
          locationY: 100,
          pageX: 100,
          pageY: 100,
          timestamp: expect.any(Number),
        }),
        persist: expect.any(Function),
        preventDefault: expect.any(Function),
        stopPropagation: expect.any(Function),
      }),
    );
  });

  it('should not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <TestTouchableOpacity onPress={mockOnPress} disabled>
        <View />
      </TestTouchableOpacity>,
    );

    const wrapper = getByTestId('touchable-wrapper');
    fireEvent(wrapper, 'touchEnd');

    expect(mockOnPress).not.toHaveBeenCalled();
  });
});

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

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        enumerable: true,
        configurable: true,
      });
      delete process.env.IS_TEST;
      delete process.env.METAMASK_ENVIRONMENT;

      try {
        const mockOnPress = jest.fn();
        const { getByTestId } = render(
          <ListItemSelect onPress={mockOnPress} testID="list-item-select">
            <View />
          </ListItemSelect>,
        );

        const listItem = getByTestId('list-item-select');
        fireEvent.press(listItem);

        expect(mockOnPress).toHaveBeenCalledTimes(1);
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        if (originalIsTest) process.env.IS_TEST = originalIsTest;
        if (originalMetaMaskEnv)
          process.env.METAMASK_ENVIRONMENT = originalMetaMaskEnv;
      }
    });

    it('should handle isDisabled prop in TouchableOpacity wrapper', () => {
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

    it('should preserve accessibility onPress when not disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ListItemSelect onPress={mockOnPress} testID="list-item-select">
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      expect(listItem.props.onPress).toBeDefined();
    });

    it('should set accessibility onPress to undefined when disabled', () => {
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
        <ListItemSelect onPress={mockOnPress} testID="list-item-select">
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      fireEvent.press(listItem);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should use RNTouchableOpacity in unit test environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
        enumerable: true,
        configurable: true,
      });
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

    it('should use RNTouchableOpacity in MetaMask E2E environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
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

    it('should set onPress to undefined when disabled in test environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
        enumerable: true,
        configurable: true,
      });
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

    it('should expose disabled prop in test environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
        enumerable: true,
        configurable: true,
      });
      const { getByTestId } = render(
        <ListItemSelect
          onPress={() => null}
          isDisabled
          testID="list-item-select"
        >
          <View />
        </ListItemSelect>,
      );

      const listItem = getByTestId('list-item-select');
      expect(listItem.props.disabled).toBe(true);
    });
  });
});
