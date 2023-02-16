// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { TextVariant } from '../../Texts/Text';
import { mockTheme } from '../../../../util/theme';

// Internal dependencies.
import TextInput from './TextInput';
import { TEXTINPUT_TEST_ID } from './TextInput.constants';

describe('TextInput', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<TextInput />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render TextInput with the correct TextVariant', () => {
    const wrapper = shallow(<TextInput textVariant={TextVariant.HeadingSM} />);
    const textInputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTINPUT_TEST_ID,
    );
    expect(textInputComponent.props().style.fontSize).toBe(
      mockTheme.typography.sHeadingSM.fontSize,
    );
  });
  it('should render the correct disabled state when disabled = true', () => {
    const wrapper = shallow(<TextInput disabled />);
    const textInputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTINPUT_TEST_ID,
    );
    expect(textInputComponent.props().editable).toBe(false);
    expect(textInputComponent.props().style.opacity).toBe(0.5);
  });

  it('should render state styles when disableStateStyles = true', () => {
    const wrapper = shallow(<TextInput disabled disableStateStyles />);
    const textInputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTINPUT_TEST_ID,
    );
    expect(textInputComponent.props().editable).toBe(false);
    expect(textInputComponent.props().style.opacity).toBe(1);
  });
});
