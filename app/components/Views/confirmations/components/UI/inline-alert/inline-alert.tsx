import React, { useCallback } from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { AlertTypeIDs } from '../../../ConfirmationView.testIds';
import { Alert, Severity } from '../../../types/alerts';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';
import styleSheet from './inline-alert.styles';

export interface InlineAlertProps {
  /** Alert object */
  alertObj: Alert;
  /** Additional styles to apply to the inline alert */
  style?: ViewStyle;
  /** Disable click interaction */
  disabled?: boolean;
}

const getTextColor = (severity: Severity) => {
  switch (severity) {
    case Severity.Danger:
      return TextColor.Error;
    case Severity.Warning:
      return TextColor.Warning;
    default:
      return TextColor.Info;
  }
};

export default function InlineAlert({
  alertObj,
  style,
  disabled = false,
}: InlineAlertProps) {
  const { showAlertModal, setAlertKey } = useAlerts();
  const { trackInlineAlertClicked } = useConfirmationAlertMetrics();
  const { styles } = useStyles(styleSheet, {});

  const handleInlineAlertClick = useCallback(() => {
    if (!alertObj || disabled) return;
    setAlertKey(alertObj.key);
    showAlertModal();
    trackInlineAlertClicked(alertObj.field);
  }, [
    alertObj,
    disabled,
    setAlertKey,
    showAlertModal,
    trackInlineAlertClicked,
  ]);

  const severity = alertObj.severity ?? Severity.Info;

  return (
    <TouchableOpacity
      testID={AlertTypeIDs.INLINE_ALERT}
      onPress={handleInlineAlertClick}
      style={[styles.iconContainer, style]}
      disabled={disabled}
    >
      <Icon
        // Show info icon for all severities except danger
        name={severity === Severity.Danger ? IconName.Danger : IconName.Info}
        size={IconSize.Sm}
        color={getTextColor(severity)}
        testID="inline-alert-icon"
      />
    </TouchableOpacity>
  );
}
