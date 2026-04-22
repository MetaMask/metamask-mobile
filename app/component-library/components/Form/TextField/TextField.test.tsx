// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import TextField from './TextField';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from './TextField.constants';

describe('TextField', () => {
  it('renders default settings correctly', () => {
    const wrapper = shallow(<TextField />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders TextField component', () => {
    const wrapper = shallow(<TextField />);

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_TEST_ID,
    );

    expect(textFieldComponent.exists()).toBe(true);
  });

  it('renders startAccessory when provided', () => {
    const wrapper = shallow(<TextField startAccessory={<View />} />);

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_STARTACCESSORY_TEST_ID,
    );

    expect(textFieldComponent.exists()).toBe(true);
  });

  it('renders endAccessory when provided', () => {
    const wrapper = shallow(<TextField endAccessory={<View />} />);

    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_ENDACCESSORY_TEST_ID,
    );

    expect(textFieldComponent.exists()).toBe(true);
  });

  it('renders as single line by default', () => {
    const wrapper = shallow(<TextField />);

    const inputComponent = wrapper.find('ForwardRef');

    expect(inputComponent.prop('numberOfLines')).toBe(1);
  });
});
