// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * SelectableMenuBase component props.
 */
export interface SelectableMenuBaseProps extends ViewProps {
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
 * Style sheet SelectableMenuBase parameters.
 */
export type SelectableMenuBaseStyleSheetVars = Pick<
  SelectableMenuBaseProps,
  'style'
>;
