/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_CELLDISPLAY_PROPS } from './variants/CellDisplay/CellDisplay.constants';
import { SAMPLE_CELLMULTISELECT_PROPS } from './variants/CellMultiSelect/CellMultiSelect.constants';
import { SAMPLE_CELLSELECT_PROPS } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import { CellVariant } from './Cell.types';
import { default as CellComponent } from './Cell';

const CellMeta = {
  title: 'Component Library / Cells',
  component: CellComponent,
  argTypes: {
    variant: {
      options: CellVariant,
      control: {
        type: 'select',
      },
      defaultValue: CellVariant.Display,
    },
  },
};
export default CellMeta;

export const Cell = {
  render: (args: { variant: CellVariant }) => {
    switch (args.variant) {
      case CellVariant.Display:
        return (
          <CellComponent
            variant={CellVariant.Display}
            {...SAMPLE_CELLDISPLAY_PROPS}
          />
        );
      case CellVariant.MultiSelect:
        return (
          <CellComponent
            variant={CellVariant.MultiSelect}
            {...SAMPLE_CELLMULTISELECT_PROPS}
          />
        );
      case CellVariant.Select:
        return (
          <CellComponent
            variant={CellVariant.Select}
            {...SAMPLE_CELLSELECT_PROPS}
          />
        );
      default:
        throw new Error('Invalid Cell Variant');
    }
  },
};
