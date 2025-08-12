// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { CellComponentSelectorsIDs } from '../../../../../e2e/selectors/wallet/CellComponent.selectors';

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
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.DISPLAY)).not.toBe(null);
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.MULTISELECT)).toBe(null);
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.SELECT)).toBe(null);
  });
  it('should render CellMultiSelect given the type MultiSelect', () => {
    const wrapper = render(
      <Cell variant={CellVariant.MultiSelect} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.DISPLAY)).toBe(null);
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.MULTISELECT)).not.toBe(
      null,
    );
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.SELECT)).toBe(null);
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = render(
      <Cell variant={CellVariant.Select} {...SAMPLE_CELL_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.DISPLAY)).toBe(null);
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.MULTISELECT)).toBe(null);
    expect(wrapper.queryByTestId(CellComponentSelectorsIDs.SELECT)).not.toBe(null);
  });
});
