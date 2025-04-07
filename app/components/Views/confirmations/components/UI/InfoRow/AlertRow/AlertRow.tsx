import React from 'react';
import InlineAlert from '../../../../AlertSystem/InlineAlert/InlineAlert';
import { useAlerts } from '../../../../AlertSystem/context';
import { useConfirmationAlertMetrics } from '../../../../hooks/useConfirmationAlertMetrics';
import { Severity } from '../../../../types/alerts';
import { TextColor } from '../../../../../../../component-library/components/Texts/Text';
import InfoRow, { InfoRowProps } from '../InfoRow';

function getAlertTextColors(severity?: Severity): TextColor {
  switch (severity) {
    case Severity.Danger:
      return TextColor.Error;
    case Severity.Warning:
      return TextColor.Warning;
    default:
      return TextColor.Default;
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
  const { fieldAlerts, showAlertModal, setAlertKey } = useAlerts();
  const { trackInlineAlertClicked } = useConfirmationAlertMetrics();
  const alertSelected = fieldAlerts.find((a) => a.field === alertField);

  const handleInlineAlertClick = () => {
    if (!alertSelected) return;
    setAlertKey(alertSelected.key);
    showAlertModal();
    trackInlineAlertClicked(alertSelected.field);
  };

  if (!alertSelected && isShownWithAlertsOnly) {
    return null;
  }

  const alertRowProps = {
    ...props,
    variant: getAlertTextColors(alertSelected?.severity),
  };

  const inlineAlert = alertSelected ? (
    <InlineAlert
      onClick={handleInlineAlertClick}
      severity={alertSelected.severity}
    />
  ) : null;

  return <InfoRow {...alertRowProps} labelChildren={inlineAlert} />;
};

export default AlertRow;
