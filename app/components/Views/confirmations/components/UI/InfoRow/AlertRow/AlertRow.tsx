import React from 'react';
import InfoRow, { InfoRowProps } from '../InfoRow';
import { useAlerts } from '../../../../context/Alerts';
import InlineAlert from '../../../Confirm/InlineAlert/InlineAlert';


export interface AlertRowProps extends InfoRowProps {
    alertKey: string;
    ownerId: string;
    /** Determines whether to display the row only when an alert is present. */
    isShownWithAlertsOnly?: boolean;
}

const AlertRow = ({ alertKey, ownerId, isShownWithAlertsOnly, ...props }: AlertRowProps) => {
    const { alerts, showAlertModal } = useAlerts();
    const alertSelected = alerts.find((a) => a.key === alertKey);

    const handleInlineAlertClick = () => {
        showAlertModal();
      };

    if (!alertSelected && isShownWithAlertsOnly) {
        return null;
    }

    const inlineAlert = alertSelected ? (
          <InlineAlert
            onClick={handleInlineAlertClick}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            severity={alertSelected.severity as any}
          />
      ) : null;

    return <InfoRow {...props} labelChildren={inlineAlert}/>;
}

export default AlertRow;
