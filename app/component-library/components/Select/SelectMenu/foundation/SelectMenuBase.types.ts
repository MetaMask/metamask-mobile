// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * SelectMenuBase component props.
 */
export interface SelectMenuBaseProps extends ViewProps {
  /**
   * Optional enum to replace the Header.
   */
  headerEl?: React.ReactNode;
  /**
   * Optional enum to replace the content section between the Header and Footer.
   */
  children?: React.ReactNode;
  /**
   * Optional enum to replace the Footer.
   */
  footerEl?: React.ReactNode;
}

/**
 * Style sheet SelectMenuBase parameters.
 */
export type SelectMenuBaseStyleSheetVars = Pick<SelectMenuBaseProps, 'style'>;
