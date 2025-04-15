// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import TextField from './TextField';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import { TextFieldSize } from './TextField.types';

describe('TextField', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<TextField />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render TextField', () => {
    const wrapper = shallow(<TextField />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CommonSelectorsIDs.TEXTFIELD_INPUT_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
  it('should render the given size', () => {
    const testSize = TextFieldSize.Lg;
    const wrapper = shallow(<TextField size={testSize} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CommonSelectorsIDs.TEXTFIELD_INPUT_TEST_ID,
    );
    expect(textFieldComponent.props().style.height).toBe(Number(testSize));
  });
  it('should render the startAccessory if given', () => {
    const wrapper = shallow(<TextField startAccessory={<View />} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CommonSelectorsIDs.TEXTFIELD_STARTACCESSORY_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
  it('should render the endAccessory if given', () => {
    const wrapper = shallow(<TextField endAccessory={<View />} />);
    const textFieldComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CommonSelectorsIDs.TEXTFIELD_ENDACCESSORY_TEST_ID,
    );
    expect(textFieldComponent.exists()).toBe(true);
  });
});
