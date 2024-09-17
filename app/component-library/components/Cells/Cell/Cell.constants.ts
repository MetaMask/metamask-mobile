/* eslint-disable import/prefer-default-export */
// External dependencies.
import { SAMPLE_CELLDISPLAY_PROPS } from './variants/CellDisplay/CellDisplay.constants';

// Internal dependencies.
import { CellProps, CellVariant } from './Cell.types';

export const SAMPLE_CELL_PROPS: CellProps = {
  variant: CellVariant.Display,
  ...SAMPLE_CELLDISPLAY_PROPS,
};
