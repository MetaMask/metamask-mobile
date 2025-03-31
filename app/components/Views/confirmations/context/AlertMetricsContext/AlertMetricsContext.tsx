import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useConfirmationAlertMetrics } from '../../hooks/useConfirmationAlertMetrics';

type TrackFunctionType = (alertField?: string) => void;

const AlertMetricsContext = createContext<{
  trackAlertRendered: () => void;
  trackInlineAlertClicked: TrackFunctionType;
} | null>(null);

interface AlertMetricsProps {
  children: ReactNode;
}

export const AlertMetricsProvider: React.FC<AlertMetricsProps> = ({
  children,
}) => {
  const { trackAlertRendered, trackInlineAlertClicked } =
    useConfirmationAlertMetrics();

  const value = useMemo(
    () => ({
      trackAlertRendered,
      trackInlineAlertClicked,
    }),
    [trackAlertRendered, trackInlineAlertClicked],
  );

  return (
    <AlertMetricsContext.Provider value={value}>
      {children}
    </AlertMetricsContext.Provider>
  );
};

export const useAlertMetrics = () => {
  const context = useContext(AlertMetricsContext);
  if (!context) {
    throw new Error(
      'useAlertMetrics must be used within an AlertMetricsProvider',
    );
  }
  return context;
};
