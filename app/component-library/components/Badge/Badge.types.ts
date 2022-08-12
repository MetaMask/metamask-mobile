// 3rd party dependencies.
import { StyleProp, ViewProps, ViewStyle } from 'react-native';

/**
 * Badge component props.
 */
export interface BadgeProps extends ViewProps {
  /**
   * The content of the badge itself. This can take in any component.
   */
  content: React.ReactNode | JSX.Element;
  /**
   * The children element that the badge will attach itself to.
   */
  children: React.ReactNode | JSX.Element;
  /**
   * Optional style opject that can be passed to the badge content.
   */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Style sheet input parameters.
 */
export type BadgeStyleSheetVars = Pick<BadgeProps, 'style' | 'contentStyle'>;
