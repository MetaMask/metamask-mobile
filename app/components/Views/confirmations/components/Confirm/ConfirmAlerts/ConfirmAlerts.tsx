import React, { ReactElement } from 'react';
import { AlertsContextProvider } from '../../../AlertSystem/context';
import useConfirmationAlerts from '../../../hooks/useConfirmationAlerts';
import { AlertMetricsProvider } from '../../../context/AlertMetricsContext/AlertMetricsContext';
import MultipleAlertModal from '../../../AlertSystem/MultipleAlertModal';

const ConfirmAlerts = ({ children }: { children: ReactElement }) => {
    const alerts = useConfirmationAlerts();
    return (
        <AlertsContextProvider alerts={alerts}>
            <AlertMetricsProvider>
                {children}
                <MultipleAlertModal />
            </AlertMetricsProvider>
        </AlertsContextProvider>
    );
};

export default ConfirmAlerts;
