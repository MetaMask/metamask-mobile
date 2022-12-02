// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconNames } from '../Icons/Icon';

// Internal dependencies.
import Checkbox from './Checkbox';
import { CHECKBOX_ICON_ID } from './Checkbox.constants';

describe('Checkbox', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Checkbox isSelected />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correct icon when selected', () => {
    const wrapper = shallow(<Checkbox isSelected />);
    const iconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CHECKBOX_ICON_ID,
    );
    const IconNames = iconComponent.props().name;
    expect(IconNames).toBe(IconNames.CheckBoxOn);
  });

  it('should render correct icon when not selected', () => {
    const wrapper = shallow(<Checkbox isSelected={false} />);
    const iconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CHECKBOX_ICON_ID,
    );
    const IconNames = iconComponent.props().name;
    expect(IconNames).toBe(IconNames.CheckBoxOff);
  });
});
