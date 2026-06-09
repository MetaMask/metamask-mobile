// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import Tab from './Tab';

describe('Tab', () => {
  const defaultProps = {
    label: 'Test Tab',
    isActive: false,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      const { getByTestId } = render(<Tab {...defaultProps} testID="tab" />);

      expect(getByTestId('tab')).toBeOnTheScreen();
    });

    it('displays the label text', () => {
      const { getAllByText } = render(<Tab {...defaultProps} label="My Tab" />);

      expect(getAllByText('My Tab')[0]).toBeOnTheScreen();
    });

    it('renders long labels without truncating the element', () => {
      const longLabel =
        'This is a very long tab label that should be truncated';

      const { getAllByText } = render(
        <Tab {...defaultProps} label={longLabel} />,
      );

      expect(getAllByText(longLabel)[0]).toBeOnTheScreen();
    });
  });

  describe('Active State', () => {
    it('renders enabled when isActive is true', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} isActive testID="active-tab" />,
      );

      expect(
        getByTestId('active-tab').props.accessibilityState?.disabled,
      ).toBeFalsy();
    });

    it('renders enabled when isActive is false', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} isActive={false} testID="inactive-tab" />,
      );

      expect(
        getByTestId('inactive-tab').props.accessibilityState?.disabled,
      ).toBeFalsy();
    });
  });

  describe('Disabled State', () => {
    it('sets disabled accessibility state when isDisabled is true', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} isDisabled testID="disabled-tab-style" />,
      );

      expect(
        getByTestId('disabled-tab-style').props.accessibilityState?.disabled,
      ).toBe(true);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();

      const { getAllByText } = render(
        <Tab {...defaultProps} onPress={mockOnPress} isDisabled />,
      );

      fireEvent.press(getAllByText('Test Tab')[0]);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('sets disabled state when isDisabled is true and isActive is false', () => {
      const { getByTestId } = render(
        <Tab
          {...defaultProps}
          isDisabled
          isActive={false}
          testID="disabled-inactive-tab"
        />,
      );

      expect(
        getByTestId('disabled-inactive-tab').props.accessibilityState?.disabled,
      ).toBe(true);
    });

    it('sets disabled state even when isActive is true', () => {
      const { getByTestId } = render(
        <Tab
          {...defaultProps}
          isDisabled
          isActive
          testID="disabled-active-tab"
        />,
      );

      expect(
        getByTestId('disabled-active-tab').props.accessibilityState?.disabled,
      ).toBe(true);
    });
  });

  describe('Interaction', () => {
    it('calls onPress when pressed and not disabled', () => {
      const mockOnPress = jest.fn();

      const { getAllByText } = render(
        <Tab {...defaultProps} onPress={mockOnPress} />,
      );

      fireEvent.press(getAllByText('Test Tab')[0]);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('is not disabled when enabled', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} testID="enabled-tab" />,
      );

      const tab = getByTestId('enabled-tab');
      expect(tab).toBeEnabled();
    });
  });

  describe('Layout and Callbacks', () => {
    it('calls onLayout callback when layout changes', () => {
      const mockOnLayout = jest.fn();
      const layoutEvent = {
        nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 40 } },
      };

      const { getByTestId } = render(
        <Tab {...defaultProps} onLayout={mockOnLayout} testID="layout-tab" />,
      );

      fireEvent(getByTestId('layout-tab'), 'onLayout', layoutEvent);

      expect(mockOnLayout).toHaveBeenCalledWith(layoutEvent);
    });

    it('does not throw when onLayout is not provided', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} testID="no-layout-tab" />,
      );
      const layoutEvent = {
        nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 40 } },
      };

      expect(() => {
        fireEvent(getByTestId('no-layout-tab'), 'onLayout', layoutEvent);
      }).not.toThrow();
    });

    it('fires onLayout for each layout event', () => {
      const mockOnLayout = jest.fn();
      const layoutEvent1 = {
        nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 40 } },
      };
      const layoutEvent2 = {
        nativeEvent: { layout: { x: 10, y: 0, width: 120, height: 40 } },
      };

      const { getByTestId } = render(
        <Tab
          {...defaultProps}
          onLayout={mockOnLayout}
          testID="multi-layout-tab"
        />,
      );
      const tab = getByTestId('multi-layout-tab');

      fireEvent(tab, 'onLayout', layoutEvent1);
      fireEvent(tab, 'onLayout', layoutEvent2);

      expect(mockOnLayout).toHaveBeenCalledTimes(2);
      expect(mockOnLayout).toHaveBeenNthCalledWith(1, layoutEvent1);
      expect(mockOnLayout).toHaveBeenNthCalledWith(2, layoutEvent2);
    });
  });

  describe('Pressable Props', () => {
    it('fires onPressIn and onPressOut callbacks', () => {
      const mockOnPressIn = jest.fn();
      const mockOnPressOut = jest.fn();

      const { getByTestId } = render(
        <Tab
          {...defaultProps}
          onPressIn={mockOnPressIn}
          onPressOut={mockOnPressOut}
          testID="pressable-tab"
        />,
      );
      const tab = getByTestId('pressable-tab');

      fireEvent(tab, 'onPressIn');
      fireEvent(tab, 'onPressOut');

      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });

    it('passes through accessibilityLabel and accessibilityHint', () => {
      const { getByTestId } = render(
        <Tab
          {...defaultProps}
          accessibilityLabel="Custom accessibility label"
          accessibilityHint="Custom accessibility hint"
          testID="accessible-tab"
        />,
      );

      const tab = getByTestId('accessible-tab');
      expect(tab.props.accessibilityLabel).toBe('Custom accessibility label');
      expect(tab.props.accessibilityHint).toBe('Custom accessibility hint');
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty label', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} label="" testID="empty-label-tab" />,
      );

      expect(getByTestId('empty-label-tab')).toBeOnTheScreen();
    });

    it('renders label with special characters and emoji', () => {
      const specialLabel = 'Tab with 🚀 emoji & special chars!@#$%';

      const { getAllByText } = render(
        <Tab {...defaultProps} label={specialLabel} />,
      );

      expect(getAllByText(specialLabel)[0]).toBeOnTheScreen();
    });
  });
});
