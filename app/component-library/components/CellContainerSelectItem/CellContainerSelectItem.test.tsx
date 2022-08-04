// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies
import { useAppThemeFromContext } from '../../../util/theme';

// Internal dependencies
import CellContainerSelectItem from './CellContainerSelectItem';
import { CELL_CONTAINER_SELECT_ITEM_SELECTED_VIEW_TEST_ID } from './CellContainerSelectItem.constants';

// eslint-disable-next-line react-hooks/rules-of-hooks
const themeDesignTokens = useAppThemeFromContext();

describe('CellContainerSelectItem - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellContainerSelectItem isSelected={false}>
        <View />
      </CellContainerSelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper select state when isSelected is true', () => {
    const wrapper = shallow(
      <CellContainerSelectItem isSelected>
        <View />
      </CellContainerSelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellContainerSelectItem', () => {
  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <CellContainerSelectItem isSelected>
        <View />
      </CellContainerSelectItem>,
    );
    const cellContainer = wrapper.findWhere(
      (node) =>
        node.prop('testID') ===
        CELL_CONTAINER_SELECT_ITEM_SELECTED_VIEW_TEST_ID,
    );
    expect(cellContainer.exists()).toBe(true);
    expect(cellContainer.props().style.backgroundColor).toBe(
      themeDesignTokens.colors.primary.muted,
    );
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <CellContainerSelectItem isSelected={false}>
        <View />
      </CellContainerSelectItem>,
    );
    const cellContainer = wrapper.findWhere(
      (node) =>
        node.prop('testID') ===
        CELL_CONTAINER_SELECT_ITEM_SELECTED_VIEW_TEST_ID,
    );
    expect(cellContainer.exists()).toBe(false);
  });
});
