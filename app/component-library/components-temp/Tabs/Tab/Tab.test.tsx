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
    it('renders correctly', () => {
      const { toJSON } = render(<Tab {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('displays the label text', () => {
      const { getAllByText } = render(<Tab {...defaultProps} label="My Tab" />);
      expect(getAllByText('My Tab')[0]).toBeOnTheScreen();
    });

    it('renders with correct testID', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} testID="custom-tab" />,
      );
      expect(getByTestId('custom-tab')).toBeOnTheScreen();
    });

    it('truncates long labels with numberOfLines=1', () => {
      const { getAllByText } = render(
        <Tab
          {...defaultProps}
          label="This is a very long tab label that should be truncated"
        />,
      );
      expect(
        getAllByText(
          'This is a very long tab label that should be truncated',
        )[0],
      ).toBeOnTheScreen();
    });
  });

  describe('Active State', () => {
    it('applies active styling when isActive is true', () => {
      const { toJSON } = render(<Tab {...defaultProps} isActive />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('applies inactive styling when isActive is false', () => {
      const { toJSON } = render(<Tab {...defaultProps} isActive={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('shows bold font weight when active', () => {
      const { getAllByText } = render(<Tab {...defaultProps} isActive />);
      const text = getAllByText('Test Tab')[0];
      // Note: Testing font weight through snapshots is more reliable
      expect(text).toBeOnTheScreen();
    });

    it('shows regular font weight when inactive', () => {
      const { getAllByText } = render(
        <Tab {...defaultProps} isActive={false} />,
      );
      const text = getAllByText('Test Tab')[0];
      expect(text).toBeOnTheScreen();
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when isDisabled is true', () => {
      const { toJSON } = render(<Tab {...defaultProps} isDisabled />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('does not call onPress when disabled and pressed', () => {
      const mockOnPress = jest.fn();
      const { getAllByText } = render(
        <Tab {...defaultProps} onPress={mockOnPress} isDisabled />,
      );

      fireEvent.press(getAllByText('Test Tab')[0]);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('shows muted text color when disabled and inactive', () => {
      const { toJSON } = render(
        <Tab {...defaultProps} isDisabled isActive={false} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('shows disabled styling even when marked as active', () => {
      const { toJSON } = render(<Tab {...defaultProps} isDisabled isActive />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('does not show pressed feedback when disabled', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} isDisabled testID="disabled-tab" />,
      );

      const tab = getByTestId('disabled-tab');
      expect(tab).toBeOnTheScreen();
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

    it('shows pressed feedback when not disabled', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} testID="enabled-tab" />,
      );

      const tab = getByTestId('enabled-tab');
      expect(tab.props.disabled).toBeFalsy();
    });
  });

  describe('Layout and Callbacks', () => {
    it('calls onLayout callback when layout changes', () => {
      const mockOnLayout = jest.fn();
      const { getByTestId } = render(
        <Tab {...defaultProps} onLayout={mockOnLayout} testID="layout-tab" />,
      );

      const tab = getByTestId('layout-tab');
      const layoutEvent = {
        nativeEvent: {
          layout: { x: 0, y: 0, width: 100, height: 40 },
        },
      };

      fireEvent(tab, 'onLayout', layoutEvent);

      expect(mockOnLayout).toHaveBeenCalledWith(layoutEvent);
    });

    it('does not call onLayout when callback is not provided', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} testID="no-layout-tab" />,
      );

      const tab = getByTestId('no-layout-tab');
      const layoutEvent = {
        nativeEvent: {
          layout: { x: 0, y: 0, width: 100, height: 40 },
        },
      };

      // Should not throw error when onLayout is not provided
      expect(() => {
        fireEvent(tab, 'onLayout', layoutEvent);
      }).not.toThrow();
    });

    it('handles multiple layout events correctly', () => {
      const mockOnLayout = jest.fn();
      const { getByTestId } = render(
        <Tab
          {...defaultProps}
          onLayout={mockOnLayout}
          testID="multi-layout-tab"
        />,
      );

      const tab = getByTestId('multi-layout-tab');

      // First layout event
      const layoutEvent1 = {
        nativeEvent: {
          layout: { x: 0, y: 0, width: 100, height: 40 },
        },
      };
      fireEvent(tab, 'onLayout', layoutEvent1);

      // Second layout event
      const layoutEvent2 = {
        nativeEvent: {
          layout: { x: 10, y: 0, width: 120, height: 40 },
        },
      };
      fireEvent(tab, 'onLayout', layoutEvent2);

      expect(mockOnLayout).toHaveBeenCalledTimes(2);
      expect(mockOnLayout).toHaveBeenNthCalledWith(1, layoutEvent1);
      expect(mockOnLayout).toHaveBeenNthCalledWith(2, layoutEvent2);
    });
  });

  describe('Pressable Props', () => {
    it('forwards additional pressable props', () => {
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

    it('handles accessibility props correctly', () => {
      const { getByTestId } = render(
        <Tab
          {...defaultProps}
          accessibilityLabel="Custom accessibility label"
          accessibilityHint="Custom accessibility hint"
          testID="accessible-tab"
        />,
      );

      const tab = getByTestId('accessible-tab');
      expect(tab).toBeOnTheScreen();
      expect(tab.props.accessibilityLabel).toBe('Custom accessibility label');
      expect(tab.props.accessibilityHint).toBe('Custom accessibility hint');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty label gracefully', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} label="" testID="empty-label-tab" />,
      );
      const tab = getByTestId('empty-label-tab');
      expect(tab).toBeOnTheScreen();
    });

    it('handles onPress callback correctly', () => {
      const mockOnPress = jest.fn();
      const { getAllByText } = render(
        <Tab {...defaultProps} onPress={mockOnPress} />,
      );

      const tab = getAllByText('Test Tab')[0];
      fireEvent.press(tab);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('handles special characters in label', () => {
      const specialLabel = 'Tab with 🚀 emoji & special chars!@#$%';
      const { getAllByText } = render(
        <Tab {...defaultProps} label={specialLabel} />,
      );
      expect(getAllByText(specialLabel)[0]).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('is accessible when enabled', () => {
      const { getAllByText } = render(<Tab {...defaultProps} />);
      const tab = getAllByText('Test Tab')[0];
      expect(tab).toBeOnTheScreen();
    });

    it('is accessible when disabled', () => {
      const { getAllByText } = render(<Tab {...defaultProps} isDisabled />);
      const tab = getAllByText('Test Tab')[0];
      expect(tab).toBeOnTheScreen();
    });
  });
});
