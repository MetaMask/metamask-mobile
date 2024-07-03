// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

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
    const { toJSON } = render(<TextField />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
  it('should render the given size', () => {
    const testSize = TextFieldSize.Lg;
    const { toJSON } = render(<TextField size={testSize} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_TEST_ID,
    );
    expect(textFieldComponent.props().style.height).toBe(Number(testSize));
  });
  it('should render the startAccessory if given', () => {
    const { toJSON } = render(<TextField startAccessory={<View />} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_STARTACCESSORY_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
  it('should render the endAccessory if given', () => {
    const { toJSON } = render(<TextField endAccessory={<View />} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_ENDACCESSORY_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
});
