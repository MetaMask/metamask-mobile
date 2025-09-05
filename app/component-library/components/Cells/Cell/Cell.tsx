/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import CellDisplay from './variants/CellDisplay';
import CellMultiSelect from './variants/CellMultiSelect';
import CellSelect from './variants/CellSelect';
import CellSelectWithMenu from '../../../components-temp/CellSelectWithMenu';
import CellMultiSelectWithMenu from '../../../components-temp/CellSelectWithMenu/CellMultiSelectWithMenu';
import { CellComponentSelectorsIDs } from '../../../../../e2e/selectors/wallet/CellComponent.selectors';

// Internal dependencies.
import { CellProps, CellVariant } from './Cell.types';

const Cell = ({ variant, hitSlop, ...props }: CellProps) => {
  switch (variant) {
    case CellVariant.Display:
      return (
        <CellDisplay testID={CellComponentSelectorsIDs.DISPLAY} {...props} />
      );
    case CellVariant.MultiSelect:
      return (
        <CellMultiSelect
          testID={CellComponentSelectorsIDs.MULTISELECT}
          {...props}
        />
      );
    case CellVariant.Select:
      return (
        <CellSelect testID={CellComponentSelectorsIDs.SELECT} {...props} />
      );
    case CellVariant.SelectWithMenu:
      return (
        <CellSelectWithMenu
          testID={CellComponentSelectorsIDs.SELECT_WITH_MENU}
          {...props}
        />
      );
    case CellVariant.MultiSelectWithMenu:
      return (
        <CellMultiSelectWithMenu
          testID={CellComponentSelectorsIDs.MULTISELECT_WITH_MENU}
          {...props}
        />
      );
    default:
      throw new Error('Invalid Cell Variant');
  }
};

export default Cell;
