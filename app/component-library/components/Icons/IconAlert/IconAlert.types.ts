import { IconProps, IconAlertSeverity } from '@metamask/design-system-react-native';

/**
 * IconAlert component props.
 */
export interface IconAlertProps extends Omit<IconProps, 'name' | 'color'> {
  /**
   * The severity of the alert icon, which determines the icon and color.
   */
  severity: IconAlertSeverity;
}

export { IconAlertSeverity };
