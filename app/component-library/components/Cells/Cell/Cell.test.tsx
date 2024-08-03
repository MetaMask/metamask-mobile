// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { CellModalSelectorsIDs } from '../../../../../e2e/selectors/Modals/CellModal.selectors';
import { SAMPLE_CELLDISPLAY_PROPS } from './variants/CellDisplay/CellDisplay.constants';
import { SAMPLE_CELLMULTISELECT_PROPS } from './variants/CellMultiSelect/CellMultiSelect.constants';
import { SAMPLE_CELLSELECT_PROPS } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import Cell from './Cell';
import { CellVariant } from './Cell.types';

describe('Cell', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = render(
      <Cell variant={CellVariant.Display} {...SAMPLE_CELLDISPLAY_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.DISPLAY)).not.toBe(null);
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.MULTISELECT)).toBe(null);
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.SELECT)).toBe(null);
  });
  it('should render CellMultiSelect given the type MultiSelect', () => {
    const wrapper = render(
      <Cell
        variant={CellVariant.MultiSelect}
        {...SAMPLE_CELLMULTISELECT_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.DISPLAY)).toBe(null);
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.MULTISELECT)).not.toBe(
      null,
    );
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.SELECT)).toBe(null);
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = render(
      <Cell variant={CellVariant.Select} {...SAMPLE_CELLSELECT_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.DISPLAY)).toBe(null);
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.MULTISELECT)).toBe(null);
    expect(wrapper.queryByTestId(CellModalSelectorsIDs.SELECT)).not.toBe(null);
  });
});
