// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import SrpInput from './index';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from '../../../component-library/components/Form/TextField/TextField.constants';
import { TextFieldSize } from '../../../component-library/components/Form/TextField/TextField.types';

describe('SrpInput', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<SrpInput />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render SrpInput', () => {
    const wrapper = shallow(<SrpInput />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
  it('should render the given size', () => {
    const testSize = TextFieldSize.Lg;
    const wrapper = shallow(<SrpInput size={testSize} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_TEST_ID,
    );
    expect(textFieldComponent.props().style.height).toBe(Number(testSize));
  });
  it('should render the startAccessory if given', () => {
    const wrapper = shallow(<SrpInput startAccessory={<View />} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_STARTACCESSORY_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
  it('should render the endAccessory if given', () => {
    const wrapper = shallow(<SrpInput endAccessory={<View />} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELD_ENDACCESSORY_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
});
