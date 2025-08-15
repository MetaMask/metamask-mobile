// Internal dependencies.
import { CellDisplayProps } from './variants/CellDisplay/CellDisplay.types';
import { CellMultiSelectProps } from './variants/CellMultiSelect/CellMultiSelect.types';
import { CellSelectProps } from './variants/CellSelect/CellSelect.types';
import { CellSelectWithMenuProps } from '../../../components-temp/CellSelectWithMenu/CellSelectWithMenu.types';

/**
 * Cell variants.
 */
export enum CellVariant {
  Select = 'Select',
  MultiSelect = 'MultiSelect',
  Display = 'Display',
  SelectWithMenu = 'SelectWithMenu',
  MultiSelectWithMenu = 'MultiSelectWithMenu',
}

/**
 * Cell Account component props.
 */
export type CellProps = (
  | CellDisplayProps
  | CellMultiSelectProps
  | CellSelectProps
  | CellSelectWithMenuProps
) & {
  /**
   * Variant of Cell
   */
  variant?: CellVariant;
};
