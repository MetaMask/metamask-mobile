// External dependencies.
import { CellAccountContentProps } from '../CellAccountContent/CellAccountContent.types';

/**
 * CellAccountBaseItem variants.
 */
export enum CellAccountItemType {
  Select = 'Select',
  Multiselect = 'Multiselect',
  Display = 'Display',
}

/**
 * Cell Account Display Item component props.
 */
export interface CellAccountBaseItemProps extends CellAccountContentProps {
  type?: CellAccountItemType;
}

/**
 * Style sheet input parameters.
 */
export type CellAccountBaseItemStyleSheetVars = Pick<
  CellAccountBaseItemProps,
  'style'
>;
