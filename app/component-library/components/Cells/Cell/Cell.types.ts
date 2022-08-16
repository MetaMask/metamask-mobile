// External dependencies.
import { CellDisplayProps } from './variants/CellDisplay/CellDisplay.types';
import { CellMultiselectProps } from './variants/CellMultiselect/CellMultiselect.types';
import { CellSelectProps } from './variants/CellSelect/CellSelect.types';

/**
 * Cell Account component props.
 */
export type CellProps =
  | CellDisplayProps
  | CellMultiselectProps
  | CellSelectProps;

/**
 * Style sheet input parameters.
 */
export type CellStyleSheetVars = Pick<CellProps, 'style'>;
