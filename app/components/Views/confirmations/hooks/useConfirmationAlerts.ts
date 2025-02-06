import { useMemo } from 'react';
import { Alert } from '../types/confirm';
import useConfirmationOriginAlerts from './alerts/useConfirmationOriginAlerts';
import useBlockaidAlerts from './alerts/useBlockaidAlerts';
import useDomainMismatchAlerts from './alerts/signatures/useDomainMismatchAlerts';

function useSignatureAlerts(): Alert[] {
  const domainMismatchAlerts = useDomainMismatchAlerts();

  return useMemo(
    () => [...domainMismatchAlerts],
    [ domainMismatchAlerts],
  );
}

export default function useConfirmationAlerts(): Alert[] {
  const blockaidAlerts = useBlockaidAlerts();
  const confirmationOriginAlerts = useConfirmationOriginAlerts();
  const signatureAlerts = useSignatureAlerts();

  return useMemo(
    () => [
      ...blockaidAlerts,
      ...confirmationOriginAlerts,
      ...signatureAlerts,
    ],
    [
      blockaidAlerts,
      confirmationOriginAlerts,
      signatureAlerts,
    ],
  );
}
