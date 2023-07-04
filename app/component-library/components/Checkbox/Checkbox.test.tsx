// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Checkbox from './Checkbox';
import {
  CHECKBOX_ICON_TESTID,
  DEFAULT_CHECKBOX_ISINDETERMINATE_ICONNAME,
  DEFAULT_CHECKBOX_ISCHECKED_ICONNAME,
} from './Checkbox.constants';

describe('Checkbox', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Checkbox />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render the correct icon when isChecked is true', () => {
    const wrapper = shallow(<Checkbox isChecked />);
    const iconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CHECKBOX_ICON_TESTID,
    );
    const iconName = iconComponent.props().name;
    expect(iconName).toBe(DEFAULT_CHECKBOX_ISCHECKED_ICONNAME);
  });

  it('should render the correct icon when isIndeterminate is true', () => {
    const wrapper = shallow(<Checkbox isIndeterminate />);
    const iconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CHECKBOX_ICON_TESTID,
    );
    const iconName = iconComponent.props().name;
    expect(iconName).toBe(DEFAULT_CHECKBOX_ISINDETERMINATE_ICONNAME);
  });

  it('should not render any icon when isChecked and isIndeterminate are false', () => {
    const wrapper = shallow(<Checkbox />);
    const iconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CHECKBOX_ICON_TESTID,
    );
    expect(iconComponent.exists()).toBe(false);
  });
});
