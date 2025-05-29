import { useMemo } from 'react';
import useBlockaidAlerts from './useBlockaidAlerts';
import useDomainMismatchAlerts from './useDomainMismatchAlerts';
import { useInsufficientBalanceAlert } from './useInsufficientBalanceAlert';
import { useAccountTypeUpgrade } from './useAccountTypeUpgrade';
import { useSignedOrSubmittedAlert } from './useSignedOrSubmittedAlert';
import { Alert } from '../../types/alerts';

function useSignatureAlerts(): Alert[] {
  const domainMismatchAlerts = useDomainMismatchAlerts();

  return useMemo(() => [...domainMismatchAlerts], [domainMismatchAlerts]);
}

function useTransactionAlerts(): Alert[] {
  const insufficientBalanceAlert = useInsufficientBalanceAlert();
  const signedOrSubmittedAlert = useSignedOrSubmittedAlert();

  return useMemo(
    () => [...insufficientBalanceAlert, ...signedOrSubmittedAlert],
    [insufficientBalanceAlert, signedOrSubmittedAlert],
  );
}
export default function useConfirmationAlerts(): Alert[] {
  const blockaidAlerts = useBlockaidAlerts();
  const signatureAlerts = useSignatureAlerts();
  const transactionAlerts = useTransactionAlerts();
  const accountTypeUpgrade = useAccountTypeUpgrade();

  return useMemo(
    () => [
      ...blockaidAlerts,
      ...signatureAlerts,
      ...transactionAlerts,
      ...accountTypeUpgrade,
    ],
    [blockaidAlerts, signatureAlerts, transactionAlerts, accountTypeUpgrade],
  );
}
