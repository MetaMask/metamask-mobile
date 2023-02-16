/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BannerBase from '../../foundation/BannerBase';
import Icon, { IconName, IconSize } from '../../../../Icon';

// Internal dependencies.
import styleSheet from './BannerAlert.styles';
import { BannerAlertProps, BannerAlertSeverity } from './BannerAlert.types';
import { DEFAULT_BANNER_ALERT_SEVERITY } from './BannerAlert.constants';

const BannerAlert: React.FC<BannerAlertProps> = ({
  style,
  severity = DEFAULT_BANNER_ALERT_SEVERITY,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, severity });
  let iconName;

  switch (severity) {
    case BannerAlertSeverity.Info:
      iconName = IconName.InfoFilled;
      break;
    case BannerAlertSeverity.Success:
      iconName = IconName.CheckCircleOnFilled;
      break;
    case BannerAlertSeverity.Error:
      iconName = IconName.DangerFilled;
      break;
    case BannerAlertSeverity.Warning:
      iconName = IconName.WarningFilled;
      break;
    default:
      iconName = IconName.InfoFilled;
      break;
  }

  const severityIcon = (
    <Icon
      name={iconName}
      color={styles.severityIcon.color}
      size={IconSize.Lg}
    />
  );

  return (
    <BannerBase style={styles.base} startAccessory={severityIcon} {...props} />
  );
};

export default BannerAlert;
