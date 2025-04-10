import { useMemo } from 'react';
import useBlockaidAlerts from './alerts/useBlockaidAlerts';
import useDomainMismatchAlerts from './alerts/signatures/useDomainMismatchAlerts';
import { Alert } from '../types/alerts';

function useSignatureAlerts(): Alert[] {
  const domainMismatchAlerts = useDomainMismatchAlerts();

  return useMemo(
    () => [...domainMismatchAlerts],
    [ domainMismatchAlerts],
  );
}

export default function useConfirmationAlerts(): Alert[] {
  const blockaidAlerts = useBlockaidAlerts();
  const signatureAlerts = useSignatureAlerts();

  return useMemo(
    () => [
      ...blockaidAlerts,
      ...signatureAlerts,
    ],
    [
      blockaidAlerts,
      signatureAlerts,
    ],
  );
}
