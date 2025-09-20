import React from 'react';
import KeypadComponents from './components';
import Keypad, { Keys } from './Keypad';
import { act, fireEvent, render } from '@testing-library/react-native';

describe('Keypad', () => {
  it('should render correctly and match snapshot', () => {
    const mockOnChange = jest.fn();
    const { toJSON } = render(
      <Keypad currency="native" value="0" onChange={mockOnChange} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls the onChange handler with correct data when a key is pressed', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(
      <Keypad currency="native" value="0" onChange={mockOnChange} />,
    );

    const button1 = getByText('1');
    act(() => {
      fireEvent.press(button1);
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      value: '1',
      valueAsNumber: 1,
      pressedKey: '1',
    });
  });

  it('should handle different currency configurations', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(
      <Keypad currency="EUR" value="0" onChange={mockOnChange} />,
    );

    // EUR uses comma as decimal separator
    const periodButton = getByText(',');
    act(() => {
      fireEvent.press(periodButton);
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      value: '0,',
      valueAsNumber: 0,
      pressedKey: Keys.Period,
    });
  });

  it('should handle currency without decimals', () => {
    const mockOnChange = jest.fn();
    const { queryByText } = render(
      <Keypad currency="JPY" value="0" onChange={mockOnChange} />,
    );

    // JPY doesn't have decimal separator, so period button shouldn't exist
    const periodButton = queryByText('.');
    expect(periodButton).toBeNull();
  });

  it('should handle delete button press', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(
      <Keypad currency="native" value="123" onChange={mockOnChange} />,
    );

    const deleteButton = getByTestId('keypad-delete-button');
    act(() => {
      fireEvent.press(deleteButton);
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      value: '12',
      valueAsNumber: 12,
      pressedKey: Keys.Back,
    });
  });

  it('should handle delete button long press (clear all)', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(
      <Keypad currency="native" value="123" onChange={mockOnChange} />,
    );

    const deleteButton = getByTestId('keypad-delete-button');
    act(() => {
      fireEvent(deleteButton, 'onLongPress');
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      value: '0',
      valueAsNumber: 0,
      pressedKey: Keys.Initial,
    });
  });

  it('should handle custom decimals parameter', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(
      <Keypad currency="USD" decimals={4} value="0" onChange={mockOnChange} />,
    );

    // Should still use . as decimal separator for USD
    const periodButton = getByText('.');
    expect(periodButton).toBeTruthy();
  });

  it('should handle error in value conversion gracefully', () => {
    const mockOnChange = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { getByText } = render(
      <Keypad currency="native" value="invalid" onChange={mockOnChange} />,
    );

    const button1 = getByText('1');
    act(() => {
      fireEvent.press(button1);
    });

    // Should still call onChange even if conversion fails
    expect(mockOnChange).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should pass custom props to period button', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(
      <Keypad
        currency="native"
        value="0"
        onChange={mockOnChange}
        periodButtonProps={{ testID: 'custom-period-button' }}
      />,
    );

    const periodButton = getByTestId('custom-period-button');
    expect(periodButton).toBeTruthy();
  });

  it('should pass custom props to delete button', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(
      <Keypad
        currency="native"
        value="0"
        onChange={mockOnChange}
        deleteButtonProps={{ testID: 'custom-delete-button' }}
      />,
    );

    const deleteButton = getByTestId('custom-delete-button');
    expect(deleteButton).toBeTruthy();
  });

  it('should handle all number keys correctly', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(
      <Keypad currency="native" value="0" onChange={mockOnChange} />,
    );

    // Test all digit keys
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    digits.forEach((digit, index) => {
      const button = getByText(digit);
      act(() => {
        fireEvent.press(button);
      });
      expect(mockOnChange).toHaveBeenNthCalledWith(index + 1, {
        value: digit,
        valueAsNumber: parseInt(digit, 10),
        pressedKey: digit,
      });
    });
  });

  it('should handle building complex numbers', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(
      <Keypad currency="native" value="0" onChange={mockOnChange} />,
    );

    // Build number "123.45"
    const button1 = getByText('1');
    const button2 = getByText('2');
    const button3 = getByText('3');
    const periodButton = getByText('.');
    const button4 = getByText('4');
    const button5 = getByText('5');

    act(() => {
      fireEvent.press(button1);
    });
    act(() => {
      fireEvent.press(button2);
    });
    act(() => {
      fireEvent.press(button3);
    });
    act(() => {
      fireEvent.press(periodButton);
    });
    act(() => {
      fireEvent.press(button4);
    });
    act(() => {
      fireEvent.press(button5);
    });

    expect(mockOnChange).toHaveBeenCalledTimes(6);
    expect(mockOnChange).toHaveBeenLastCalledWith({
      value: expect.any(String),
      valueAsNumber: expect.any(Number),
      pressedKey: '5',
    });
  });
});

describe('Keypad components', () => {
  it('components should render correctly and match snapshot', () => {
    const dummyHandler = jest.fn();
    const { toJSON } = render(
      <KeypadComponents>
        <KeypadComponents.Row>
          <KeypadComponents.Button onPress={dummyHandler}>
            1
          </KeypadComponents.Button>
          <KeypadComponents.Button onPress={dummyHandler}>
            2
          </KeypadComponents.Button>
          <KeypadComponents.Button onPress={dummyHandler}>
            3
          </KeypadComponents.Button>
        </KeypadComponents.Row>
        <KeypadComponents.Row>
          <KeypadComponents.Button onPress={dummyHandler}>
            4
          </KeypadComponents.Button>
          <KeypadComponents.Button onPress={dummyHandler}>
            5
          </KeypadComponents.Button>
          <KeypadComponents.Button onPress={dummyHandler}>
            6
          </KeypadComponents.Button>
        </KeypadComponents.Row>
        <KeypadComponents.Row>
          <KeypadComponents.Button onPress={dummyHandler}>
            7
          </KeypadComponents.Button>
          <KeypadComponents.Button onPress={dummyHandler}>
            8
          </KeypadComponents.Button>
          <KeypadComponents.Button onPress={dummyHandler}>
            9
          </KeypadComponents.Button>
        </KeypadComponents.Row>
        <KeypadComponents.Row>
          <KeypadComponents.Button onPress={dummyHandler}>
            .
          </KeypadComponents.Button>
          <KeypadComponents.Button onPress={dummyHandler}>
            0
          </KeypadComponents.Button>
          <KeypadComponents.DeleteButton onPress={dummyHandler} />
        </KeypadComponents.Row>
      </KeypadComponents>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls the onPress handler when a button is pressed', () => {
    const dummyHandler = jest.fn();
    const { getByText } = render(
      <KeypadComponents>
        <KeypadComponents.Button onPress={dummyHandler}>
          1
        </KeypadComponents.Button>
      </KeypadComponents>,
    );

    const button1 = getByText('1');
    act(() => {
      fireEvent.press(button1);
    });
    expect(dummyHandler).toHaveBeenCalled();
  });
});
