import React from 'react';
import InlineAlert from '../../inline-alert';
import { useAlerts } from '../../../../context/alert-system-context';
import { Severity } from '../../../../types/alerts';
import { TextColor } from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import InfoRow, { InfoRowProps, InfoRowVariant } from '../info-row';
import styleSheet from './alert-row.styles';
import { IconColor } from '../../../../../../../component-library/components/Icons/Icon';

function getAlertTextColors(severity?: Severity): TextColor {
  switch (severity) {
    case Severity.Danger:
      return TextColor.Error;
    case Severity.Warning:
      return TextColor.Warning;
    default:
      return TextColor.Alternative;
  }
}

function getAlertIconColors(severity?: Severity): IconColor {
  switch (severity) {
    case Severity.Danger:
      return IconColor.Error;
    case Severity.Warning:
      return IconColor.Warning;
    default:
      return IconColor.Alternative;
  }
}

export interface AlertRowProps extends InfoRowProps {
  alertField: string;
  /** Determines whether to display the row only when an alert is present. */
  isShownWithAlertsOnly?: boolean;
  /** Disable click interaction on the alert */
  disableAlertInteraction?: boolean;
}

const AlertRow = ({
  alertField,
  isShownWithAlertsOnly,
  disableAlertInteraction,
  ...props
}: AlertRowProps) => {
  const { fieldAlerts } = useAlerts();
  const alertSelected = fieldAlerts.find((a) => a.field === alertField);
  const { styles } = useStyles(styleSheet, {});
  const { rowVariant, style } = props;

  if (!alertSelected && isShownWithAlertsOnly) {
    return null;
  }

  const isSmall = rowVariant === InfoRowVariant.Small;

  const alertRowProps = {
    ...props,
    variant: getAlertTextColors(alertSelected?.severity),
    tooltipColor: isSmall
      ? getAlertIconColors(alertSelected?.severity)
      : undefined,
  };

  const inlineAlert =
    alertSelected && !isSmall ? (
      <InlineAlert
        alertObj={alertSelected}
        disabled={disableAlertInteraction}
      />
    ) : null;

  return (
    <InfoRow
      {...alertRowProps}
      style={style ?? (isSmall ? undefined : styles.infoRowOverride)}
      labelChildren={inlineAlert}
    />
  );
};

export default AlertRow;
