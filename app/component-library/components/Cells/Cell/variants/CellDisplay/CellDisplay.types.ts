// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CellVariants } from '../../Cell.types';
import { CardProps } from 'app/component-library/components/Cards/Card/Card.types';
import { Insets } from 'react-native';

/**
 * Cell Account Select  component props.
 */
export interface CellDisplayProps
  extends CellBaseProps,
    Omit<CardProps, 'children'> {
  /**
   * Type of Cell
   */
  variant: CellVariants.Display;
  hitSlop?: Insets | undefined;
}

/**
 * Style sheet input parameters.
 */
export type CellDisplayStyleSheetVars = Pick<CellDisplayProps, 'style'>;
