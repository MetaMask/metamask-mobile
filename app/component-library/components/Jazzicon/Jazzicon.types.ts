// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Jazzicon component props.
 */
export interface JazziconProps extends ViewProps {
  size: number;
  address?: string;
  seed?: number;
  colors?: string[];
  wobble?: number;
  shapeCount?: number;
}

/**
 * Style sheet input parameters.
 */
export type JazziconStyleSheetVars = Pick<JazziconProps, 'style'> & {
  size: number;
};
