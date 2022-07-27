// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies
import { useAppThemeFromContext } from '../../../util/theme';

// Internal dependencies
import CellContainerSelectOption from './CellContainerSelectOption';
import { CELL_CONTAINER_SELECT_OPTION_BASE_TEST_ID } from './CellContainerSelectOption.constants';

const themeDesignTokens = useAppThemeFromContext();

describe('CellContainerSelectOption', () => {
  it('should be highlighted when selected', () => {
    const wrapper = shallow(
      <CellContainerSelectOption isSelected>
        <View />
      </CellContainerSelectOption>,
    );
    const cellContainer = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_CONTAINER_SELECT_OPTION_BASE_TEST_ID,
    );
    expect(cellContainer.props().style.backgroundColor).toBe(themeDesignTokens.colors.primary.muted);
  });

  it('should not be highlighted when not selected', () => {
    const wrapper = shallow(
      <CellContainerSelectOption isSelected={false}>
        <View />
      </CellContainerSelectOption>,
    );
    const cellContainer = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_CONTAINER_SELECT_OPTION_BASE_TEST_ID,
    );
    expect(cellContainer.props().style.backgroundColor).toBe(themeDesignTokens.colors.background.default);
  });
});
