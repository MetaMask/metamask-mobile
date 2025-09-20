import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import Keypad, {
  type KeypadContainerProps,
  type KeypadButtonProps,
  type KeypadDeleteButtonProps,
} from './components';

describe('Keypad Components', () => {
  describe('KeypadContainer', () => {
    it('should render with default gap', () => {
      const { toJSON } = render(
        <Keypad>
          <Keypad.Button onPress={jest.fn()}>Test</Keypad.Button>
        </Keypad>,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should pass through additional props', () => {
      const testProps: KeypadContainerProps = {
        testID: 'keypad-container',
        accessibilityLabel: 'Custom keypad',
      };
      const { getByTestId } = render(
        <Keypad {...testProps}>
          <Keypad.Button onPress={jest.fn()}>Test</Keypad.Button>
        </Keypad>,
      );

      const container = getByTestId('keypad-container');
      expect(container).toBeTruthy();
    });
  });

  describe('KeypadRow', () => {
    it('should render children in a row', () => {
      const { toJSON } = render(
        <Keypad.Row>
          <Keypad.Button onPress={jest.fn()}>1</Keypad.Button>
          <Keypad.Button onPress={jest.fn()}>2</Keypad.Button>
          <Keypad.Button onPress={jest.fn()}>3</Keypad.Button>
        </Keypad.Row>,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should accept additional props', () => {
      const { getByTestId } = render(
        <Keypad.Row testID="keypad-row">
          <Keypad.Button onPress={jest.fn()}>Test</Keypad.Button>
        </Keypad.Row>,
      );

      const row = getByTestId('keypad-row');
      expect(row).toBeTruthy();
    });
  });

  describe('KeypadButton', () => {
    it('should render with default variant', () => {
      const mockOnPress = jest.fn();
      const { toJSON } = render(
        <Keypad.Button onPress={mockOnPress}>5</Keypad.Button>,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should call onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Keypad.Button onPress={mockOnPress}>5</Keypad.Button>,
      );

      fireEvent.press(getByText('5'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should render with custom variant', () => {
      const mockOnPress = jest.fn();
      const { toJSON } = render(
        <Keypad.Button onPress={mockOnPress} variant={ButtonVariant.Primary}>
          5
        </Keypad.Button>,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should handle missing onPress gracefully', () => {
      const { getByText } = render(<Keypad.Button>5</Keypad.Button>);

      // Should not throw when pressed without onPress handler
      expect(() => fireEvent.press(getByText('5'))).not.toThrow();
    });

    it('should pass through additional button props', () => {
      const mockOnPress = jest.fn();
      const buttonProps: Partial<KeypadButtonProps> = {
        testID: 'keypad-button-5',
        accessibilityLabel: 'Number 5',
        disabled: true,
      };

      const { getByTestId } = render(
        <Keypad.Button onPress={mockOnPress} {...buttonProps}>
          5
        </Keypad.Button>,
      );

      const button = getByTestId('keypad-button-5');
      expect(button).toBeTruthy();
    });

    it('should apply boxWrapperProps to wrapper', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Keypad.Button
          onPress={mockOnPress}
          boxWrapperProps={{ testID: 'wrapper-box' }}
        >
          5
        </Keypad.Button>,
      );

      const wrapper = getByTestId('wrapper-box');
      expect(wrapper).toBeTruthy();
    });

    it('should render without children', () => {
      const mockOnPress = jest.fn();
      const { toJSON } = render(<Keypad.Button onPress={mockOnPress} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('KeypadDeleteButton', () => {
    it('should render with backspace icon', () => {
      const mockOnPress = jest.fn();
      const { toJSON } = render(<Keypad.DeleteButton onPress={mockOnPress} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should call onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByRole } = render(
        <Keypad.DeleteButton onPress={mockOnPress} />,
      );

      const button = getByRole('button');
      fireEvent.press(button);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should call onLongPress when long pressed', () => {
      const mockOnPress = jest.fn();
      const mockOnLongPress = jest.fn();
      const { getByRole } = render(
        <Keypad.DeleteButton
          onPress={mockOnPress}
          onLongPress={mockOnLongPress}
        />,
      );

      const button = getByRole('button');
      fireEvent(button, 'onLongPress');
      expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    });

    it('should handle missing handlers gracefully', () => {
      const { getByRole } = render(<Keypad.DeleteButton />);

      const button = getByRole('button');
      expect(() => fireEvent.press(button)).not.toThrow();
      expect(() => fireEvent(button, 'onLongPress')).not.toThrow();
    });

    it('should use custom delayLongPress', () => {
      const mockOnPress = jest.fn();
      const mockOnLongPress = jest.fn();
      const { toJSON } = render(
        <Keypad.DeleteButton
          onPress={mockOnPress}
          onLongPress={mockOnLongPress}
          delayLongPress={1000}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should pass through additional button props', () => {
      const mockOnPress = jest.fn();
      const deleteButtonProps: Partial<KeypadDeleteButtonProps> = {
        testID: 'delete-button',
        accessibilityLabel: 'Delete number',
        disabled: true,
      };

      const { getByTestId } = render(
        <Keypad.DeleteButton onPress={mockOnPress} {...deleteButtonProps} />,
      );

      const button = getByTestId('delete-button');
      expect(button).toBeTruthy();
    });

    it('should apply boxWrapperProps to wrapper', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Keypad.DeleteButton
          onPress={mockOnPress}
          boxWrapperProps={{ testID: 'delete-wrapper-box' }}
        />,
      );

      const wrapper = getByTestId('delete-wrapper-box');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('Keypad compound component', () => {
    it('should have all required sub-components', () => {
      expect(Keypad.Row).toBeDefined();
      expect(Keypad.Button).toBeDefined();
      expect(Keypad.DeleteButton).toBeDefined();
    });

    it('should render complete keypad layout', () => {
      const mockOnPress = jest.fn();
      const { toJSON } = render(
        <Keypad>
          <Keypad.Row>
            <Keypad.Button onPress={mockOnPress}>1</Keypad.Button>
            <Keypad.Button onPress={mockOnPress}>2</Keypad.Button>
            <Keypad.Button onPress={mockOnPress}>3</Keypad.Button>
          </Keypad.Row>
          <Keypad.Row>
            <Keypad.Button onPress={mockOnPress}>4</Keypad.Button>
            <Keypad.Button onPress={mockOnPress}>5</Keypad.Button>
            <Keypad.Button onPress={mockOnPress}>6</Keypad.Button>
          </Keypad.Row>
          <Keypad.Row>
            <Keypad.Button onPress={mockOnPress}>7</Keypad.Button>
            <Keypad.Button onPress={mockOnPress}>8</Keypad.Button>
            <Keypad.Button onPress={mockOnPress}>9</Keypad.Button>
          </Keypad.Row>
          <Keypad.Row>
            <Keypad.Button onPress={mockOnPress}>.</Keypad.Button>
            <Keypad.Button onPress={mockOnPress}>0</Keypad.Button>
            <Keypad.DeleteButton onPress={mockOnPress} />
          </Keypad.Row>
        </Keypad>,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should handle mixed button types in same row', () => {
      const mockOnPress = jest.fn();
      const { getByText, getAllByRole } = render(
        <Keypad.Row>
          <Keypad.Button onPress={mockOnPress}>.</Keypad.Button>
          <Keypad.Button onPress={mockOnPress}>0</Keypad.Button>
          <Keypad.DeleteButton onPress={mockOnPress} testID="delete-button" />
        </Keypad.Row>,
      );

      // Test regular buttons
      fireEvent.press(getByText('.'));
      fireEvent.press(getByText('0'));
      expect(mockOnPress).toHaveBeenCalledTimes(2);

      // Test delete button by role (should be the last button)
      const buttons = getAllByRole('button');
      const deleteButton = buttons[buttons.length - 1];
      fireEvent.press(deleteButton);
      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });
});
