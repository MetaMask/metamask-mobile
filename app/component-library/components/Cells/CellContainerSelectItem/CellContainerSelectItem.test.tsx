// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellContainerSelectItem from './CellContainerSelectItem';
import { SELECTABLE_LIST_ITEM_OVERLAY_ID } from './CellContainerSelectItem.constants';

describe('CellContainerSelectItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <CellContainerSelectItem isSelected>
        <View />
      </CellContainerSelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <CellContainerSelectItem isSelected>
        <View />
      </CellContainerSelectItem>,
    );
    const overlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === SELECTABLE_LIST_ITEM_OVERLAY_ID,
    );
    expect(overlayComponent.exists()).toBe(true);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <CellContainerSelectItem isSelected={false}>
        <View />
      </CellContainerSelectItem>,
    );
    const overlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === SELECTABLE_LIST_ITEM_OVERLAY_ID,
    );
    expect(overlayComponent.exists()).toBe(false);
  });
});
