import { useMemo } from 'react';
import { Alert } from '../types/confirm-alerts';

export default function useConfirmationAlerts(): Alert[] {
  return useMemo(
    () => [],[],
  );
}
