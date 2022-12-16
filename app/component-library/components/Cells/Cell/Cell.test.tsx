// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Cell from './Cell';
import {
  TEST_AVATAR_PROPS,
  TEST_CELL_TITLE,
  CELL_DISPLAY_TEST_ID,
  CELL_MULTI_SELECT_TEST_ID,
  CELL_SELECT_TEST_ID,
} from './Cell.constants';
import { CellVariants } from './Cell.types';

describe('Cell - Snapshot', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Display}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellMultiselect given the type Multiselect', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Multiselect}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Select}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Cell', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Display}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
      />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(true);

    const cellMultiselectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_MULTI_SELECT_TEST_ID,
    );
    expect(cellMultiselectComponent.exists()).toBe(false);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(false);
  });
  it('should render CellMultiselect given the type Multiselect', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Multiselect}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
      />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(false);

    const cellMultiselectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_MULTI_SELECT_TEST_ID,
    );
    expect(cellMultiselectComponent.exists()).toBe(true);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(false);
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Select}
        avatarProps={TEST_AVATAR_PROPS}
        title={TEST_CELL_TITLE}
      />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(false);

    const cellMultiselectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_MULTI_SELECT_TEST_ID,
    );
    expect(cellMultiselectComponent.exists()).toBe(false);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(true);
  });
});
