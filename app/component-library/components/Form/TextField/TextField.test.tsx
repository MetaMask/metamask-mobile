// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import TextField from './TextField';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from './TextField.constants';
import { TextFieldSize } from './TextField.types';

describe('TextField', () => {
  it('should render default settings correctly', () => {
    const { toJSON } = render(<TextField />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render TextField', () => {
    render(<TextField />);
    const textFieldComponent = screen.getByTestId(TEXTFIELD_TEST_ID);
    expect(textFieldComponent).toBeTruthy();
  });

  it('should render the given size', () => {
    const testSize = TextFieldSize.Lg;
    render(<TextField size={testSize} />);
    const textFieldComponent = screen.getByTestId(TEXTFIELD_TEST_ID);
    expect(textFieldComponent.props.style.height).toBe(Number(testSize));
  });

  it('should render the startAccessory if given', () => {
    render(<TextField startAccessory={<View />} />);
    const textFieldComponent = screen.getByTestId(
      TEXTFIELD_STARTACCESSORY_TEST_ID,
    );
    expect(textFieldComponent).toBeTruthy();
  });

  it('should render the endAccessory if given', () => {
    render(<TextField endAccessory={<View />} />);
    const textFieldComponent = screen.getByTestId(
      TEXTFIELD_ENDACCESSORY_TEST_ID,
    );
    expect(textFieldComponent).toBeTruthy();
  });
});
