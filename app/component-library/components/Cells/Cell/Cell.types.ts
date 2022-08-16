// Internal dependencies.
import { CellDisplayProps } from './variants/CellDisplay/CellDisplay.types';
import { CellMultiselectProps } from './variants/CellMultiselect/CellMultiselect.types';
import { CellSelectProps } from './variants/CellSelect/CellSelect.types';

/**
 * Cell variants.
 */
export enum CellVariants {
  Select = 'Select',
  Multiselect = 'Multiselect',
  Display = 'Display',
}

/**
 * Cell Account component props.
 */
export type CellProps =
  | CellDisplayProps
  | CellMultiselectProps
  | CellSelectProps;
