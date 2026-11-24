// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellVariant } from '../../Cell.types';
import { CardProps } from '../../../../Cards/Card/Card.types';

/**
 * Cell Account Select  component props.
 */
export interface CellDisplayProps
  extends CellBaseProps,
    Omit<CardProps, 'children'> {
  /**
   * Type of Cell
   */
  variant?: CellVariant.Display;
}

/**
 * Style sheet input parameters.
 */
export type CellDisplayStyleSheetVars = Pick<CellDisplayProps, 'style'>;
