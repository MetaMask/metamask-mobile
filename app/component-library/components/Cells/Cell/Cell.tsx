/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import { CellType } from './foundation/CellBase/CellBase.types';
import CellDisplay from './variants/CellDisplay';
import CellMultiselect from './variants/CellMultiselect';
import CellSelect from './variants/CellSelect';

// Internal dependencies.
import { CellProps } from './Cell.types';
import {
  CELL_DISPLAY_TEST_ID,
  CELL_MULTI_SELECT_TEST_ID,
  CELL_SELECT_TEST_ID,
} from './Cell.constants';

const Cell = (cellProps: CellProps) => {
  switch (cellProps.type) {
    case CellType.Display:
      return <CellDisplay testID={CELL_DISPLAY_TEST_ID} {...cellProps} />;
    case CellType.Multiselect:
      return (
        <CellMultiselect testID={CELL_MULTI_SELECT_TEST_ID} {...cellProps} />
      );
    case CellType.Select:
      return <CellSelect testID={CELL_SELECT_TEST_ID} {...cellProps} />;
    default:
      return <CellDisplay testID={CELL_DISPLAY_TEST_ID} {...cellProps} />;
  }
};

export default Cell;
