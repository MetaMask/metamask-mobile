import { useMemo } from 'react';
import useBlockaidAlerts from './alerts/useBlockaidAlerts';
import useDomainMismatchAlerts from './alerts/signatures/useDomainMismatchAlerts';
import { useInsufficientBalanceAlert } from './useInsufficientBalanceAlert';
import { Alert } from '../types/alerts';


function useSignatureAlerts(): Alert[] {
  const domainMismatchAlerts = useDomainMismatchAlerts();

  return useMemo(() => [...domainMismatchAlerts], [domainMismatchAlerts]);
}

function useTransactionAlerts(): Alert[] {
  const insufficientBalanceAlert = useInsufficientBalanceAlert();

  return useMemo(
    () => [...insufficientBalanceAlert],
    [insufficientBalanceAlert],
  );
}
export default function useConfirmationAlerts(): Alert[] {
  const blockaidAlerts = useBlockaidAlerts();
  const signatureAlerts = useSignatureAlerts();
  const transactionAlerts = useTransactionAlerts();

  return useMemo(
    () => [
      ...blockaidAlerts,
      ...signatureAlerts,
      ...transactionAlerts,
    ],
    [
      blockaidAlerts,
      signatureAlerts,
      transactionAlerts,
    ],
  );
}
