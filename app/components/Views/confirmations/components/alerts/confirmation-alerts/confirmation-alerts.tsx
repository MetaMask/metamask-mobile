import React, { memo, useLayoutEffect, useState } from 'react';
import { AlertsContextProvider } from '../../../context/alert-system-context';
import { useConfirmationFirstFrame } from '../../../context/confirmation-first-frame-context';
import useConfirmationAlerts from '../../../hooks/alerts/useConfirmationAlerts';
import { Alert, NO_ALERTS } from '../../../types/alerts';

const ConfirmationAlertsUpdater = memo(ConfirmationAlertsUpdaterInternal);

export function ConfirmationAlerts({
  children,
}: {
  children: React.ReactNode;
}) {
  const firstFrame = useConfirmationFirstFrame();

  if (firstFrame) {
    return (
      <DeferredConfirmationAlerts
        isFirstFrameComplete={firstFrame.isFirstFrameComplete}
      >
        {children}
      </DeferredConfirmationAlerts>
    );
  }

  return <ImmediateConfirmationAlerts>{children}</ImmediateConfirmationAlerts>;
}

function ImmediateConfirmationAlerts({
  children,
}: {
  children: React.ReactNode;
}) {
  const alerts = useConfirmationAlerts();

  return (
    <AlertsContextProvider alerts={alerts}>{children}</AlertsContextProvider>
  );
}

function DeferredConfirmationAlerts({
  children,
  isFirstFrameComplete,
}: {
  children: React.ReactNode;
  isFirstFrameComplete: boolean;
}) {
  const [alerts, setAlerts] = useState<Alert[]>();

  // Keep the provider and its children mounted across the frame boundary.
  // Only the hook owner is deferred; pending checks block confirmation.
  return (
    <>
      {isFirstFrameComplete && (
        <ConfirmationAlertsUpdater onChange={setAlerts} />
      )}
      <AlertsContextProvider
        alerts={alerts ?? NO_ALERTS}
        isPending={alerts === undefined}
      >
        {children}
      </AlertsContextProvider>
    </>
  );
}

function ConfirmationAlertsUpdaterInternal({
  onChange,
}: {
  onChange: (alerts: Alert[]) => void;
}) {
  const alerts = useConfirmationAlerts();

  useLayoutEffect(() => {
    onChange(alerts);
  }, [alerts, onChange]);

  return null;
}
