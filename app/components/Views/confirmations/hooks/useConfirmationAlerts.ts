import { useMemo } from 'react';
import { Alert } from '../types/alerts';

export default function useConfirmationAlerts(): Alert[] {
  return useMemo(
    () => [],[],
  );
}
