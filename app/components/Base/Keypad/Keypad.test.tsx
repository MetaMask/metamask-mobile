import React from 'react';
import KeypadComponents from './components';
import Keypad from '.';
import { act, fireEvent, render } from '@testing-library/react-native';
import { RectButton } from 'react-native-gesture-handler';

describe('Keypad', () => {
  it('renders all digit keys', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(
      <Keypad currency="native" value="0" onChange={mockOnChange} />,
    );
    expect(getByText('1')).toBeOnTheScreen();
    expect(getByText('5')).toBeOnTheScreen();
    expect(getByText('0')).toBeOnTheScreen();
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
});

describe('Keypad components', () => {
  it('renders all provided buttons', () => {
    const dummyHandler = jest.fn();
    const { getByText } = render(
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
    expect(getByText('1')).toBeOnTheScreen();
    expect(getByText('9')).toBeOnTheScreen();
    expect(getByText('.')).toBeOnTheScreen();
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

    expect(dummyHandler).toHaveBeenCalledTimes(1);
  });

  it('renders non-interruptible RectButton gestures for keypad buttons', () => {
    const { UNSAFE_getAllByType } = render(
      <KeypadComponents>
        <KeypadComponents.Button onPress={jest.fn()}>1</KeypadComponents.Button>
        <KeypadComponents.DeleteButton onPress={jest.fn()} />
      </KeypadComponents>,
    );

    const buttons = UNSAFE_getAllByType(RectButton);

    expect(buttons).toHaveLength(2);
    expect(buttons[0].props.enabled).toBe(true);
    expect(buttons[0].props.exclusive).toBe(false);
    expect(buttons[0].props.shouldActivateOnStart).toBe(true);
    expect(buttons[0].props.disallowInterruption).toBe(true);
    expect(buttons[1].props.exclusive).toBe(false);
    expect(buttons[1].props.shouldActivateOnStart).toBe(true);
    expect(buttons[1].props.disallowInterruption).toBe(true);
  });

  it('disables the RectButton gesture when the keypad button is disabled', () => {
    const { UNSAFE_getByType } = render(
      <KeypadComponents.Button isDisabled onPress={jest.fn()}>
        1
      </KeypadComponents.Button>,
    );

    const button = UNSAFE_getByType(RectButton);

    expect(button.props.enabled).toBe(false);
  });
});
