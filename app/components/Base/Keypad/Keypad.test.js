import React from 'react';
import { render } from '@testing-library/react-native';
import Keypad from './components';

describe('Keypad component', () => {
  test('components should render correctly', () => {
    const dummyHandler = jest.fn();
    const { toJSON } = render(
      <Keypad>
        <Keypad.Row>
          <Keypad.Button onPress={dummyHandler}>1</Keypad.Button>
          <Keypad.Button onPress={dummyHandler}>2</Keypad.Button>
          <Keypad.Button onPress={dummyHandler}>3</Keypad.Button>
        </Keypad.Row>
        <Keypad.Row>
          <Keypad.Button onPress={dummyHandler}>4</Keypad.Button>
          <Keypad.Button onPress={dummyHandler}>5</Keypad.Button>
          <Keypad.Button onPress={dummyHandler}>6</Keypad.Button>
        </Keypad.Row>
        <Keypad.Row>
          <Keypad.Button onPress={dummyHandler}>7</Keypad.Button>
          <Keypad.Button onPress={dummyHandler}>8</Keypad.Button>
          <Keypad.Button onPress={dummyHandler}>9</Keypad.Button>
        </Keypad.Row>
        <Keypad.Row>
          <Keypad.Button onPress={dummyHandler}>.</Keypad.Button>
          <Keypad.Button onPress={dummyHandler}>0</Keypad.Button>
          <Keypad.DeleteButton onPress={dummyHandler} />
        </Keypad.Row>
      </Keypad>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
