// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { TextVariant } from '../../../../Texts/Text';
import { mockTheme } from '../../../../../../util/theme';

// Internal dependencies.
import Input from './Input';
import { INPUT_TEST_ID } from './Input.constants';

describe('Input', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Input />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Input with the correct TextVariant', () => {
    const wrapper = shallow(<Input textVariant={TextVariant.HeadingSM} />);
    const inputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === INPUT_TEST_ID,
    );
    expect(inputComponent.props().style.fontSize).toBe(
      mockTheme.typography.sHeadingSM.fontSize,
    );
  });
  it('should render the correct disabled state when disabled = true', () => {
    const wrapper = shallow(<Input isDisabled />);
    const inputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === INPUT_TEST_ID,
    );
    expect(inputComponent.props().editable).toBe(false);
    expect(inputComponent.props().style.opacity).toBe(0.5);
  });

  it('should not render state styles when isStateStylesDisabled = true', () => {
    const wrapper = shallow(<Input isStateStylesDisabled />);
    const inputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === INPUT_TEST_ID,
    );
    expect(inputComponent.props().style.opacity).toBe(1);
  });
});
