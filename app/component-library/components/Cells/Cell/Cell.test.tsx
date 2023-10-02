// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { CELLDISPLAY_TEST_ID } from './variants/CellDisplay/CellDisplay.constants';
import { CELLMULTISELECT_TEST_ID } from './variants/CellMultiSelect/CellMultiSelect.constants';
import { CELLSELECT_TEST_ID } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import Cell from './Cell';
import {
  SAMPLE_CELL_TITLE,
  SAMPLE_CELL_SECONDARYTEXT,
  SAMPLE_CELL_TERTIARY_TEXT,
  SAMPLE_CELL_TAGLABEL,
  SAMPLE_CELL_AVATARPROPS,
} from './Cell.constants';
import { CellVariants } from './Cell.types';

describe('Cell - Snapshot', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Display}
        title={SAMPLE_CELL_TITLE}
        secondaryText={SAMPLE_CELL_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELL_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELL_TAGLABEL}
        avatarProps={SAMPLE_CELL_AVATARPROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellMultiSelect given the type MultiSelect', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.MultiSelect}
        title={SAMPLE_CELL_TITLE}
        secondaryText={SAMPLE_CELL_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELL_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELL_TAGLABEL}
        avatarProps={SAMPLE_CELL_AVATARPROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Select}
        title={SAMPLE_CELL_TITLE}
        secondaryText={SAMPLE_CELL_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELL_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELL_TAGLABEL}
        avatarProps={SAMPLE_CELL_AVATARPROPS}
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
        title={SAMPLE_CELL_TITLE}
        secondaryText={SAMPLE_CELL_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELL_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELL_TAGLABEL}
        avatarProps={SAMPLE_CELL_AVATARPROPS}
      />,
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
      <Cell
        variant={CellVariants.MultiSelect}
        title={SAMPLE_CELL_TITLE}
        secondaryText={SAMPLE_CELL_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELL_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELL_TAGLABEL}
        avatarProps={SAMPLE_CELL_AVATARPROPS}
      />,
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
      <Cell
        variant={CellVariants.Select}
        title={SAMPLE_CELL_TITLE}
        secondaryText={SAMPLE_CELL_SECONDARYTEXT}
        tertiaryText={SAMPLE_CELL_TERTIARY_TEXT}
        tagLabel={SAMPLE_CELL_TAGLABEL}
        avatarProps={SAMPLE_CELL_AVATARPROPS}
      />,
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
