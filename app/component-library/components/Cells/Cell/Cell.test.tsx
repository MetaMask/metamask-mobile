// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { CELLDISPLAY_TEST_ID } from './variants/CellDisplay/CellDisplay.constants';
import { CELLMULTISELECT_TEST_ID } from './variants/CellMultiSelect/CellMultiSelect.constants';
import { CELLSELECT_TEST_ID } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import Cell from './Cell';
import { SAMPLE_CELL_PROPS } from './Cell.constants';
import { CellVariant } from './Cell.types';

describe('Cell', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = render(
      <Cell variant={CellVariant.Display} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CELLDISPLAY_TEST_ID)).not.toBe(null);
    expect(wrapper.queryByTestId(CELLMULTISELECT_TEST_ID)).toBe(null);
    expect(wrapper.queryByTestId(CELLSELECT_TEST_ID)).toBe(null);
  });
  it('should render CellMultiSelect given the type MultiSelect', () => {
    const wrapper = render(
      <Cell variant={CellVariant.MultiSelect} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CELLDISPLAY_TEST_ID)).toBe(null);
    expect(wrapper.queryByTestId(CELLMULTISELECT_TEST_ID)).not.toBe(null);
    expect(wrapper.queryByTestId(CELLSELECT_TEST_ID)).toBe(null);
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = render(
      <Cell variant={CellVariant.Select} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CELLDISPLAY_TEST_ID)).toBe(null);
    expect(wrapper.queryByTestId(CELLMULTISELECT_TEST_ID)).toBe(null);
    expect(wrapper.queryByTestId(CELLSELECT_TEST_ID)).not.toBe(null);
  });
});
