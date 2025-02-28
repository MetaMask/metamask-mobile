import React from 'react';
import InfoRow, { InfoRowProps } from '../InfoRow';
import { useAlerts } from '../../../../AlertSystem/context';
import InlineAlert from '../../../../AlertSystem/InlineAlert/InlineAlert';
import { TextColor } from '../../../../../../../component-library/components/Texts/Text';
import { Severity } from '../../../../types/alerts';

function getAlertTextColors(
  severity?: Severity,
): TextColor {
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
    alertKey: string;
    /** Determines whether to display the row only when an alert is present. */
    isShownWithAlertsOnly?: boolean;
}

const AlertRow = ({ alertKey, isShownWithAlertsOnly, ...props }: AlertRowProps) => {
    const { alerts, showAlertModal, setAlertKey } = useAlerts();
    const alertSelected = alerts.find((a) => a.key === alertKey);

    const handleInlineAlertClick = () => {
        setAlertKey(alertKey);
        showAlertModal();
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

    return <InfoRow {...alertRowProps} labelChildren={inlineAlert}/>;
};

export default AlertRow;
