import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import SelectableListItem from './SelectableListItem';
import { SELECTABLE_LIST_ITEM_OVERLAY_ID } from '../../../constants/test-ids';

describe('SelectableListItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SelectableListItem isSelected>
        <View />
      </SelectableListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <SelectableListItem isSelected>
        <View />
      </SelectableListItem>,
    );
    const overlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === SELECTABLE_LIST_ITEM_OVERLAY_ID,
    );
    expect(overlayComponent.exists()).toBe(true);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <SelectableListItem isSelected={false}>
        <View />
      </SelectableListItem>,
    );
    const overlayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === SELECTABLE_LIST_ITEM_OVERLAY_ID,
    );
    expect(overlayComponent.exists()).toBe(false);
  });
});
