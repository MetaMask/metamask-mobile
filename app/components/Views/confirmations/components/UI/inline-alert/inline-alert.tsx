import React, { useCallback } from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlertTypeIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { IconSizes } from '../../../../../../component-library/components-temp/KeyValueRow';
import { useTheme } from '../../../../../../util/theme';
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

const getBackgroundColor = (severity: Severity, colors: ThemeColors) => {
  switch (severity) {
    case Severity.Danger:
      return colors.error.muted;
    case Severity.Warning:
      return colors.warning.muted;
    default:
      return colors.info.muted;
  }
};

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
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: getBackgroundColor(severity, colors) },
        style,
      ]}
    >
      <TouchableOpacity
        testID={AlertTypeIDs.INLINE_ALERT}
        onPress={handleInlineAlertClick}
        style={styles.inlineContainer}
        disabled={disabled}
      >
        <Icon
          name={severity === Severity.Info ? IconName.Info : IconName.Danger}
          size={IconSize.Sm}
          color={getTextColor(severity)}
          style={styles.icon}
          testID="inline-alert-icon"
        />
        <Text variant={TextVariant.BodySM} color={getTextColor(severity)}>
          {strings('alert_system.inline_alert_label')}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSizes.Xs}
          color={getTextColor(severity)}
        />
      </TouchableOpacity>
    </View>
  );
}
