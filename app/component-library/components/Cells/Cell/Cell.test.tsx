// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { CELLDISPLAY_TEST_ID } from './variants/CellDisplay/CellDisplay.constants';
import { CELLMULTISELECT_TEST_ID } from './variants/CellMultiSelect/CellMultiSelect.constants';
import { CELLSELECT_TEST_ID } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import Cell from './Cell';
import { SAMPLE_CELL_PROPS } from './Cell.constants';
import { CellVariants } from './Cell.types';

describe('Cell - Snapshot', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = shallow(
      <Cell variant={CellVariants.Display} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellMultiSelect given the type MultiSelect', () => {
    const wrapper = shallow(
      <Cell variant={CellVariants.MultiSelect} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = shallow(
      <Cell variant={CellVariants.Select} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Cell', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = shallow(
      <Cell variant={CellVariants.Display} {...SAMPLE_CELL_PROPS} />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLDISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(true);

    const cellMultiSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLMULTISELECT_TEST_ID,
    );
    expect(cellMultiSelectComponent.exists()).toBe(false);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLSELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(false);
  });
  it('should render CellMultiSelect given the type MultiSelect', () => {
    const wrapper = shallow(
      <Cell variant={CellVariants.MultiSelect} {...SAMPLE_CELL_PROPS} />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLDISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(false);

    const cellMultiSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLMULTISELECT_TEST_ID,
    );
    expect(cellMultiSelectComponent.exists()).toBe(true);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLSELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(false);
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = shallow(
      <Cell variant={CellVariants.Select} {...SAMPLE_CELL_PROPS} />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLDISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(false);

    const cellMultiSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLMULTISELECT_TEST_ID,
    );
    expect(cellMultiSelectComponent.exists()).toBe(false);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLSELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(true);
  });
});
