import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { Alert, Severity } from '../../../types/alerts';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';
import styleSheet from './alert-badge.styles';

function getIconProps(severity: Severity) {
  switch (severity) {
    case Severity.Danger:
      return { name: IconName.Danger, color: IconColor.Error };
    case Severity.Warning:
      return { name: IconName.Warning, color: IconColor.Warning };
    default:
      return { name: IconName.Info, color: IconColor.Info };
  }
}

function getTextColor(severity: Severity): TextColor {
  switch (severity) {
    case Severity.Danger:
      return TextColor.Error;
    case Severity.Warning:
      return TextColor.Warning;
    default:
      return TextColor.Info;
  }
}

export interface AlertBadgeProps {
  alert: Alert;
}

const AlertBadge = ({ alert }: AlertBadgeProps) => {
  const { showAlertModal, setAlertKey } = useAlerts();
  const { trackInlineAlertClicked } = useConfirmationAlertMetrics();
  const { styles } = useStyles(styleSheet, { severity: alert.severity });

  const iconProps = getIconProps(alert.severity);
  const textColor = getTextColor(alert.severity);

  const handlePress = useCallback(() => {
    setAlertKey(alert.key);
    showAlertModal();
    trackInlineAlertClicked(alert.field);
  }, [alert, setAlertKey, showAlertModal, trackInlineAlertClicked]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID="alert-badge"
    >
      <Icon name={iconProps.name} color={iconProps.color} size={IconSize.Sm} />
      <Text variant={TextVariant.BodyMD} color={textColor} numberOfLines={1}>
        {alert.title}
      </Text>
      <Icon
        name={IconName.ArrowRight}
        color={iconProps.color}
        size={IconSize.Xs}
      />
    </TouchableOpacity>
  );
};

export default AlertBadge;
