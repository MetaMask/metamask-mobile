/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_CELLDISPLAY_PROPS } from './variants/CellDisplay/CellDisplay.constants';
import { SAMPLE_CELLMULTISELECT_PROPS } from './variants/CellMultiSelect/CellMultiSelect.constants';
import { SAMPLE_CELLSELECT_PROPS } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import { CellVariants } from './Cell.types';
import { default as CellComponent } from './Cell';

const CellMeta = {
  title: 'Component Library / Cells',
  component: CellComponent,
  argTypes: {
    variant: {
      options: CellVariants,
      control: {
        type: 'select',
      },
      defaultValue: CellVariants.Display,
    },
  },
};
export default CellMeta;

export const Cell = {
  render: (args: { variant: CellVariants }) => {
    switch (args.variant) {
      case CellVariants.Display:
        return (
          <CellComponent
            variant={CellVariants.Display}
            {...SAMPLE_CELLDISPLAY_PROPS}
          />
        );
      case CellVariants.MultiSelect:
        return (
          <CellComponent
            variant={CellVariants.MultiSelect}
            {...SAMPLE_CELLMULTISELECT_PROPS}
          />
        );
      case CellVariants.Select:
        return (
          <CellComponent
            variant={CellVariants.Select}
            {...SAMPLE_CELLSELECT_PROPS}
          />
        );
      default:
        throw new Error('Invalid Cell Variant');
    }
  },
};
