// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import MultiselectItem from './MultiselectItem';
import { MULTISELECT_ITEM_UNDERLAY_ID } from './MultiselectItem.constants';

describe('MultiselectItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <MultiselectItem isSelected>
        <View />
      </MultiselectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <MultiselectItem isSelected>
        <View />
      </MultiselectItem>,
    );
    const underlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MULTISELECT_ITEM_UNDERLAY_ID,
    );
    expect(underlayComponent.exists()).toBe(true);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <MultiselectItem isSelected={false}>
        <View />
      </MultiselectItem>,
    );
    const underlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MULTISELECT_ITEM_UNDERLAY_ID,
    );
    expect(underlayComponent.exists()).toBe(false);
  });
});
