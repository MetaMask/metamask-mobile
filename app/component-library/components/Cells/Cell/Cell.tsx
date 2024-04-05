/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import CellDisplay from './variants/CellDisplay';
import CellMultiSelect from './variants/CellMultiSelect';
import CellSelect from './variants/CellSelect';
import { CellModalSelectorsIDs } from '../../../../../e2e/selectors/Modals/CellModal.selectors';

// Internal dependencies.
import { CellProps, CellVariant } from './Cell.types';

const Cell = ({ variant, ...props }: CellProps) => {
  switch (variant) {
    case CellVariant.Display:
      return <CellDisplay testID={CellModalSelectorsIDs.DISPLAY} {...props} />;
    case CellVariant.MultiSelect:
      return (
        <CellMultiSelect
          testID={CellModalSelectorsIDs.MULTISELECT}
          {...props}
        />
      );
    case CellVariant.Select:
      return <CellSelect testID={CellModalSelectorsIDs.SELECT} {...props} />;
    default:
      throw new Error('Invalid Cell Variant');
  }
};

export default Cell;
