/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import CellDisplay from './variants/CellDisplay';
import { CELLDISPLAY_TEST_ID } from './variants/CellDisplay/CellDisplay.constants';
import CellMultiSelect from './variants/CellMultiSelect';
import { CELLMULTISELECT_TEST_ID } from './variants/CellMultiSelect/CellMultiSelect.constants';
import CellSelect from './variants/CellSelect';
import { CELLSELECT_TEST_ID } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import { CellProps, CellVariant } from './Cell.types';

const Cell = ({ variant, ...props }: CellProps) => {
  switch (variant) {
    case CellVariant.Display:
      return <CellDisplay testID={CELLDISPLAY_TEST_ID} {...props} />;
    case CellVariant.MultiSelect:
      return <CellMultiSelect testID={CELLMULTISELECT_TEST_ID} {...props} />;
    case CellVariant.Select:
      return <CellSelect testID={CELLSELECT_TEST_ID} {...props} />;
    default:
      throw new Error('Invalid Cell Variant');
  }
};

export default Cell;
