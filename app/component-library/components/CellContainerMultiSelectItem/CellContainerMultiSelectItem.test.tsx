// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies
import { useAppThemeFromContext } from '../../../util/theme';

// Internal dependencies
import CellContainerMultiSelectItem from './CellContainerMultiSelectItem';
import {
  CELL_CONTAINER_MULTISELECT_ITEM_SELECTED_VIEW_TEST_ID,
  CELL_CONTAINER_MULTISELECT_ITEM_CHECKBOX_TEST_ID,
} from './CellContainerMultiSelectItem.constants';

// eslint-disable-next-line react-hooks/rules-of-hooks
const themeDesignTokens = useAppThemeFromContext();

describe('CellContainerMultiSelectItem - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectItem isSelected={false}>
        <View />
      </CellContainerMultiSelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper select state when isSelected is true', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectItem isSelected>
        <View />
      </CellContainerMultiSelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellContainerMultiSelectItem', () => {
  it('should have a checked checkbox when selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectItem isSelected>
        <View />
      </CellContainerMultiSelectItem>,
    );
    const checkboxComponent = wrapper.findWhere(
      (node) =>
        node.prop('testID') ===
        CELL_CONTAINER_MULTISELECT_ITEM_CHECKBOX_TEST_ID,
    );
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(true);
  });

  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectItem isSelected>
        <View />
      </CellContainerMultiSelectItem>,
    );
    const cellContainer = wrapper.findWhere(
      (node) =>
        node.prop('testID') ===
        CELL_CONTAINER_MULTISELECT_ITEM_SELECTED_VIEW_TEST_ID,
    );
    expect(cellContainer.exists()).toBe(true);
    expect(cellContainer.props().style.backgroundColor).toBe(
      themeDesignTokens.colors.primary.muted,
    );
  });

  it('should not have a checked checkbox when not selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectItem isSelected={false}>
        <View />
      </CellContainerMultiSelectItem>,
    );
    const checkboxComponent = wrapper.findWhere(
      (node) =>
        node.prop('testID') ===
        CELL_CONTAINER_MULTISELECT_ITEM_CHECKBOX_TEST_ID,
    );
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(false);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectItem isSelected={false}>
        <View />
      </CellContainerMultiSelectItem>,
    );
    const cellContainer = wrapper.findWhere(
      (node) =>
        node.prop('testID') ===
        CELL_CONTAINER_MULTISELECT_ITEM_SELECTED_VIEW_TEST_ID,
    );
    expect(cellContainer.exists()).toBe(false);
  });
});
