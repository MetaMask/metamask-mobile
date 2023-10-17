// Internal dependencies.
import { CellDisplayProps } from './variants/CellDisplay/CellDisplay.types';
import { CellMultiSelectProps } from './variants/CellMultiSelect/CellMultiSelect.types';
import { CellSelectProps } from './variants/CellSelect/CellSelect.types';

/**
 * Cell variants.
 */
export enum CellVariants {
  Select = 'Select',
  MultiSelect = 'MultiSelect',
  Display = 'Display',
}

/**
 * Cell Account component props.
 */
export type CellProps =
  | CellDisplayProps
  | CellMultiSelectProps
  | CellSelectProps;
