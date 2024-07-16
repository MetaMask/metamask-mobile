// External dependencies.
import { CellBaseProps } from '../../foundation/CellBase/CellBase.types';
import { CardProps } from 'app/component-library/components/Cards/Card/Card.types';

/**
 * Cell Account Select  component props.
 */
export interface CellDisplayProps
  extends Omit<CellBaseProps, 'hitSlop' | 'style'>,
    Omit<CardProps, 'children'> {}

/**
 * Style sheet input parameters.
 */
export type CellDisplayStyleSheetVars = Pick<CellDisplayProps, 'style'>;
