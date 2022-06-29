import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import MultiselectListItem from './MultiselectListItem';

describe('MultiselectListItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <MultiselectListItem isSelected>
        <View />
      </MultiselectListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should be checked when selected', () => {
    const wrapper = shallow(
      <MultiselectListItem isSelected>
        <View />
      </MultiselectListItem>,
    );
    const checkboxComponent = wrapper.childAt(0);
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(true);
  });

  it('should not be checked when not selected', () => {
    const wrapper = shallow(
      <MultiselectListItem isSelected={false}>
        <View />
      </MultiselectListItem>,
    );
    const checkboxComponent = wrapper.childAt(0);
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(false);
  });
});
