// External dependencies.
import { CellAccountContentProps } from '../CellAccountContent/CellAccountContent.types';

/**
 * CellAccountBaseItem variants.
 */
export enum CellAccountBaseItemType {
  Select = 'Select',
  Multiselect = 'Multiselect',
  Display = 'Display',
  Picker = 'Picker',
}

/**
 * Cell Account Display Item component props.
 */
export interface CellAccountBaseItemProps extends CellAccountContentProps {
  type?: CellAccountBaseItemType;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountBaseItemStyleSheetVars = Pick<
  CellAccountBaseItemProps,
  'style'
>;
