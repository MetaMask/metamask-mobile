import { useMemo } from 'react';
import useBlockaidAlerts from './useBlockaidAlerts';
import useDomainMismatchAlerts from './useDomainMismatchAlerts';
import { useInsufficientBalanceAlert } from './useInsufficientBalanceAlert';
import { useAccountTypeUpgrade } from './useAccountTypeUpgrade';
import { useSignedOrSubmittedAlert } from './useSignedOrSubmittedAlert';
import { usePendingTransactionAlert } from './usePendingTransactionAlert';
import { Alert } from '../../types/alerts';
import { useBatchedUnusedApprovalsAlert } from './useBatchedUnusedApprovalsAlert';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { useNoPayTokenQuotesAlert } from './useNoPayTokenQuotesAlert';

function useSignatureAlerts(): Alert[] {
  const domainMismatchAlerts = useDomainMismatchAlerts();

  return useMemo(() => [...domainMismatchAlerts], [domainMismatchAlerts]);
}

function useTransactionAlerts(): Alert[] {
  const insufficientBalanceAlert = useInsufficientBalanceAlert();
  const signedOrSubmittedAlert = useSignedOrSubmittedAlert();
  const pendingTransactionAlert = usePendingTransactionAlert();
  const batchedUnusedApprovalsAlert = useBatchedUnusedApprovalsAlert();
  const perpsDepositMinimumAlert = usePerpsDepositMinimumAlert();
  const insufficientPayTokenBalanceAlert =
    useInsufficientPayTokenBalanceAlert();
  const noPayTokenQuotesAlert = useNoPayTokenQuotesAlert();

  return useMemo(
    () => [
      ...insufficientBalanceAlert,
      ...batchedUnusedApprovalsAlert,
      ...pendingTransactionAlert,
      ...signedOrSubmittedAlert,
      ...perpsDepositMinimumAlert,
      ...insufficientPayTokenBalanceAlert,
      ...noPayTokenQuotesAlert,
    ],
    [
      insufficientBalanceAlert,
      batchedUnusedApprovalsAlert,
      pendingTransactionAlert,
      signedOrSubmittedAlert,
      perpsDepositMinimumAlert,
      insufficientPayTokenBalanceAlert,
      noPayTokenQuotesAlert,
    ],
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
