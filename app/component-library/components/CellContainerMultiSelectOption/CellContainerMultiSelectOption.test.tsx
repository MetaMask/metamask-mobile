// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies
import { useAppThemeFromContext } from '../../../util/theme';

// Internal dependencies
import CellContainerMultiSelectOption from './CellContainerMultiSelectOption';
import { CELL_CONTAINER_MULTISELECT_OPTION_BASE_TEST_ID } from './CellContainerMultiSelectOption.constants';

const themeDesignTokens = useAppThemeFromContext();

describe('CellContainerMultiSelectOption', () => {
  it('should have a checked checkbox when selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectOption isSelected>
        <View />
      </CellContainerMultiSelectOption>,
    );
    const checkboxComponent = wrapper.childAt(0);
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(true);
  });

  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectOption isSelected>
        <View />
      </CellContainerMultiSelectOption>,
    );
    const cellContainer = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_CONTAINER_MULTISELECT_OPTION_BASE_TEST_ID,
    );
    expect(cellContainer.props().style.backgroundColor).toBe(themeDesignTokens.colors.primary.muted);
  });

  it('should not have a checked checkbox when not selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectOption isSelected={false}>
        <View />
      </CellContainerMultiSelectOption>,
    );
    const checkboxComponent = wrapper.childAt(0);
    const isSelected = checkboxComponent.props().isSelected;
    expect(isSelected).toBe(false);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <CellContainerMultiSelectOption isSelected={false}>
        <View />
      </CellContainerMultiSelectOption>,
    );
    const cellContainer = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_CONTAINER_MULTISELECT_OPTION_BASE_TEST_ID,
    );
    expect(cellContainer.props().style.backgroundColor).toBe(themeDesignTokens.colors.background.default);
  });
});
