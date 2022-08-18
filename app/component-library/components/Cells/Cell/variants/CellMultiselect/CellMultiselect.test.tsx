// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { TEST_AVATAR_PROPS, TEST_CELL_TITLE } from '../../Cell.constants';
import { CellVariants } from '../../Cell.types';

// Internal dependencies.
import CellMultiselect from './CellMultiselect';
import { CELL_MULTI_SELECT_TEST_ID } from './CellMultiselect.constants';

describe('CellMultiselect - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellMultiselect
        variant={CellVariants.Multiselect}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <CellMultiselect
        variant={CellVariants.Multiselect}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellMultiselect', () => {
  it('should render singleSelect', () => {
    const wrapper = shallow(
      <CellMultiselect
        variant={CellVariants.Multiselect}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_MULTI_SELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
