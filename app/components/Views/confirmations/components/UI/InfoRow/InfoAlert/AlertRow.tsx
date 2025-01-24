import React from 'react';
import { useAlerts } from '../../../../context/Alerts';
import InfoRow, { InfoRowProps } from '../InfoRow';
import { View } from 'react-native-reanimated/lib/typescript/Animated';
import InlineAlert from '../../../Confirm/InlineAlert/inlineAlert';


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
        <View>
          <InlineAlert
            onClick={handleInlineAlertClick}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            severity={alertSelected.severity as any}
          />
        </View>
      ) : null;

    return <InfoRow {...props} labelChildren={inlineAlert}/>;
}

export default AlertRow;