// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import SelectItem from './SelectItem';
import { SELECTABLE_ITEM_UNDERLAY_ID } from './SelectItem.constants';

describe('SelectItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SelectItem isSelected>
        <View />
      </SelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <SelectItem isSelected>
        <View />
      </SelectItem>,
    );
    const underlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === SELECTABLE_ITEM_UNDERLAY_ID,
    );
    expect(underlayComponent.exists()).toBe(true);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <SelectItem isSelected={false}>
        <View />
      </SelectItem>,
    );
    const underlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === SELECTABLE_ITEM_UNDERLAY_ID,
    );
    expect(underlayComponent.exists()).toBe(false);
  });
});
