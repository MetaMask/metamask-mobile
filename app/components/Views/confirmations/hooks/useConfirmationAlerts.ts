import { useMemo } from 'react';
import useBlockaidAlerts from './alerts/useBlockaidAlerts';
import { Alert } from '../types/alerts';

export default function useConfirmationAlerts(): Alert[] {
  const blockaidAlerts = useBlockaidAlerts();

  return useMemo(
    () => [
      ...blockaidAlerts,
    ],
    [
      blockaidAlerts,
    ],
  );
}
