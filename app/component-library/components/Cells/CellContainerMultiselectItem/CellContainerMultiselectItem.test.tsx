// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellContainerMultiselectItem from './CellContainerMultiselectItem';
import { MULTISELECT_ITEM_UNDERLAY_ID } from './CellContainerMultiselectItem.constants';

describe('CellContainerMultiselectItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <CellContainerMultiselectItem isSelected>
        <View />
      </CellContainerMultiselectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <CellContainerMultiselectItem isSelected>
        <View />
      </CellContainerMultiselectItem>,
    );
    const underlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MULTISELECT_ITEM_UNDERLAY_ID,
    );
    expect(underlayComponent.exists()).toBe(true);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <CellContainerMultiselectItem isSelected={false}>
        <View />
      </CellContainerMultiselectItem>,
    );
    const underlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === MULTISELECT_ITEM_UNDERLAY_ID,
    );
    expect(underlayComponent.exists()).toBe(false);
  });
});
