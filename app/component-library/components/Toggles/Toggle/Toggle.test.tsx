// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Toggle from './Toggle';
import { TOGGLE_TEST_ID } from './Toggle.constants';

describe('Toggle', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Toggle />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correct toggle when isSelected is false', () => {
    const wrapper = shallow(<Toggle />);
    const toggleComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOGGLE_TEST_ID,
    );
    expect(toggleComponent.props().value).toBe(false);
  });
  it('should render correct toggle when isSelected is true', () => {
    const wrapper = shallow(<Toggle isSelected />);
    const toggleComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOGGLE_TEST_ID,
    );
    expect(toggleComponent.props().value).toBe(true);
  });
});
