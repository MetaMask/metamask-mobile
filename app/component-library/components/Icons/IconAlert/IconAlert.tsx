import React from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconAlertSeverity,
} from '@metamask/design-system-react-native';
import { IconAlertProps } from './IconAlert.types';

/**
 * Maps severity to icon name and color.
 * Info variant uses IconDefault color instead of PrimaryDefault.
 */
const ICON_ALERT_SEVERITY_MAP: Record<
  IconAlertSeverity,
  { name: IconName; color: IconColor }
> = {
  [IconAlertSeverity.Info]: {
    name: IconName.Info,
    color: IconColor.IconDefault,
  },
  [IconAlertSeverity.Success]: {
    name: IconName.Confirmation,
    color: IconColor.SuccessDefault,
  },
  [IconAlertSeverity.Warning]: {
    name: IconName.Danger,
    color: IconColor.WarningDefault,
  },
  [IconAlertSeverity.Danger]: {
    name: IconName.Error,
    color: IconColor.ErrorDefault,
  },
};

/**
 * IconAlert component - A local wrapper that overrides the info variant
 * to use IconDefault color instead of PrimaryDefault.
 *
 * @param props - IconAlertProps
 * @returns React element
 */
const IconAlert: React.FC<IconAlertProps> & { displayName: string } = ({
  severity,
  ...props
}) => {
  const { name, color } = ICON_ALERT_SEVERITY_MAP[severity];
  return <Icon {...props} color={color} name={name} />;
};

IconAlert.displayName = 'IconAlert';

export default IconAlert;
