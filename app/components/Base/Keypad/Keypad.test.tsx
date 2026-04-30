import React from 'react';
import KeypadComponents from './components';
import Keypad from '.';
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
