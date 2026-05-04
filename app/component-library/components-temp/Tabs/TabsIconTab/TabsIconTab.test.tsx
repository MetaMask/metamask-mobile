// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import TabsIconTab from './TabsIconTab';
import { IconName } from '../../../components/Icons/Icon/Icon.types';

describe('TabsIconTab', () => {
  const defaultProps = {
    label: 'Portfolio',
    iconName: IconName.Portfolio,
    isActive: false,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      const { getByTestId } = render(
        <TabsIconTab {...defaultProps} testID="tab" />,
      );
      expect(getByTestId('tab')).toBeOnTheScreen();
    });

    it('displays the label text', () => {
      const { getByText } = render(<TabsIconTab {...defaultProps} />);
      expect(getByText('Portfolio')).toBeOnTheScreen();
    });
  });

  describe('Active State', () => {
    it('renders enabled when isActive is true', () => {
      const { getByTestId } = render(
        <TabsIconTab {...defaultProps} isActive testID="active-tab" />,
      );
      expect(
        getByTestId('active-tab').props.accessibilityState?.disabled,
      ).toBeFalsy();
    });

    it('renders enabled when isActive is false', () => {
      const { getByTestId } = render(
        <TabsIconTab
          {...defaultProps}
          isActive={false}
          testID="inactive-tab"
        />,
      );
      expect(
        getByTestId('inactive-tab').props.accessibilityState?.disabled,
      ).toBeFalsy();
    });
  });

  describe('Disabled State', () => {
    it('sets disabled accessibility state when isDisabled is true', () => {
      const { getByTestId } = render(
        <TabsIconTab {...defaultProps} isDisabled testID="disabled-tab" />,
      );
      expect(
        getByTestId('disabled-tab').props.accessibilityState?.disabled,
      ).toBe(true);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <TabsIconTab {...defaultProps} onPress={mockOnPress} isDisabled />,
      );
      fireEvent.press(getByText('Portfolio'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when pressed and not disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <TabsIconTab {...defaultProps} onPress={mockOnPress} testID="tab" />,
      );
      fireEvent.press(getByTestId('tab'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout and Callbacks', () => {
    it('calls onLayout callback when layout changes', () => {
      const mockOnLayout = jest.fn();
      const layoutEvent = {
        nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 60 } },
      };
      const { getByTestId } = render(
        <TabsIconTab
          {...defaultProps}
          onLayout={mockOnLayout}
          testID="layout-tab"
        />,
      );
      fireEvent(getByTestId('layout-tab'), 'onLayout', layoutEvent);
      expect(mockOnLayout).toHaveBeenCalledWith(layoutEvent);
    });
  });

  describe('Icon', () => {
    it('renders all supported icon names without throwing', () => {
      const icons: IconName[] = [
        IconName.Portfolio,
        IconName.Candlestick,
        IconName.Predict,
      ];
      icons.forEach((icon) => {
        expect(() =>
          render(
            <TabsIconTab {...defaultProps} iconName={icon} testID="icon-tab" />,
          ),
        ).not.toThrow();
      });
    });
  });
});
