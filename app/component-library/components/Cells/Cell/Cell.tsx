/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import CellDisplay from './variants/CellDisplay';
import CellMultiselect from './variants/CellMultiselect';
import CellSelect from './variants/CellSelect';

// Internal dependencies.
import { CellProps, CellVariants } from './Cell.types';
import {
  CELL_DISPLAY_TEST_ID,
  CELL_MULTI_SELECT_TEST_ID,
  CELL_SELECT_TEST_ID,
} from './Cell.constants';

const Cell = (cellProps: CellProps) => {
  switch (cellProps.variant) {
    case CellVariants.Display:
      return <CellDisplay testID={CELL_DISPLAY_TEST_ID} {...cellProps} />;
    case CellVariants.Multiselect:
      return (
        <CellMultiselect testID={CELL_MULTI_SELECT_TEST_ID} {...cellProps} />
      );
    case CellVariants.Select:
      return <CellSelect testID={CELL_SELECT_TEST_ID} {...cellProps} />;
    default:
      throw new Error('Invalid Cell Variant');
  }
};

export default Cell;
