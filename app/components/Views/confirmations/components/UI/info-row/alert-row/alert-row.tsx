import React from 'react';
import InlineAlert from '../../inline-alert';
import { useAlerts } from '../../../../context/alert-system-context';
import { Severity } from '../../../../types/alerts';
import { TextColor } from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import InfoRow, { InfoRowProps } from '../info-row';
import styleSheet from './alert-row.styles';

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

export interface AlertRowProps extends InfoRowProps {
  alertField: string;
  /** Determines whether to display the row only when an alert is present. */
  isShownWithAlertsOnly?: boolean;
}

const AlertRow = ({
  alertField,
  isShownWithAlertsOnly,
  ...props
}: AlertRowProps) => {
  const { fieldAlerts } = useAlerts();
  const alertSelected = fieldAlerts.find((a) => a.field === alertField);
  const { styles } = useStyles(styleSheet, {});

  if (!alertSelected && isShownWithAlertsOnly) {
    return null;
  }

  const alertRowProps = {
    ...props,
    variant: getAlertTextColors(alertSelected?.severity),
  };

  const inlineAlert = alertSelected ? (
    <InlineAlert alertObj={alertSelected} />
  ) : null;

  return (
    <InfoRow
      {...alertRowProps}
      style={styles.infoRowOverride}
      labelChildren={inlineAlert}
    />
  );
};

export default AlertRow;
