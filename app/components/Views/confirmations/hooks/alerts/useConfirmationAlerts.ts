import { useMemo } from 'react';
import useBlockaidAlerts from './useBlockaidAlerts';
import useDomainMismatchAlerts from './useDomainMismatchAlerts';
import { useInsufficientBalanceAlert } from './useInsufficientBalanceAlert';
import { useAccountTypeUpgrade } from './useAccountTypeUpgrade';
import { useSignedOrSubmittedAlert } from './useSignedOrSubmittedAlert';
import { usePendingTransactionAlert } from './usePendingTransactionAlert';
import { Alert } from '../../types/alerts';
import { useBatchedUnusedApprovalsAlert } from './useBatchedUnusedApprovalsAlert';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { useNoPayTokenQuotesAlert } from './useNoPayTokenQuotesAlert';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';
import { useBurnAddressAlert } from './useBurnAddressAlert';
import { useTokenTrustSignalAlerts } from './useTokenTrustSignalAlerts';
import { useAddressTrustSignalAlerts } from './useAddressTrustSignalAlerts';
import { useUrlTrustSignalAlerts } from './useUrlTrustSignalAlerts';

function useSignatureAlerts(): Alert[] {
  const domainMismatchAlerts = useDomainMismatchAlerts();

  return useMemo(() => [...domainMismatchAlerts], [domainMismatchAlerts]);
}

function useTransactionAlerts(): Alert[] {
  const insufficientBalanceAlert = useInsufficientBalanceAlert();
  const signedOrSubmittedAlert = useSignedOrSubmittedAlert();
  const pendingTransactionAlert = usePendingTransactionAlert();
  const batchedUnusedApprovalsAlert = useBatchedUnusedApprovalsAlert();
  const insufficientPayTokenBalanceAlert =
    useInsufficientPayTokenBalanceAlert();
  const noPayTokenQuotesAlert = useNoPayTokenQuotesAlert();
  const insufficientPredictBalanceAlert = useInsufficientPredictBalanceAlert();
  const burnAddressAlert = useBurnAddressAlert();
  const tokenTrustSignalAlerts = useTokenTrustSignalAlerts();
  const addressTrustSignalAlerts = useAddressTrustSignalAlerts();

  return useMemo(
    () => [
      ...insufficientBalanceAlert,
      ...batchedUnusedApprovalsAlert,
      ...pendingTransactionAlert,
      ...signedOrSubmittedAlert,
      ...insufficientPayTokenBalanceAlert,
      ...noPayTokenQuotesAlert,
      ...insufficientPredictBalanceAlert,
      ...burnAddressAlert,
      ...tokenTrustSignalAlerts,
      ...addressTrustSignalAlerts,
    ],
    [
      insufficientBalanceAlert,
      batchedUnusedApprovalsAlert,
      pendingTransactionAlert,
      signedOrSubmittedAlert,
      insufficientPayTokenBalanceAlert,
      noPayTokenQuotesAlert,
      insufficientPredictBalanceAlert,
      burnAddressAlert,
      tokenTrustSignalAlerts,
      addressTrustSignalAlerts,
    ],
  );
}
export default function useConfirmationAlerts(): Alert[] {
  const blockaidAlerts = useBlockaidAlerts();
  const signatureAlerts = useSignatureAlerts();
  const transactionAlerts = useTransactionAlerts();
  const accountTypeUpgrade = useAccountTypeUpgrade();
  const urlTrustSignalAlerts = useUrlTrustSignalAlerts();

  return useMemo(
    () => [
      ...blockaidAlerts,
      ...signatureAlerts,
      ...transactionAlerts,
      ...accountTypeUpgrade,
      ...urlTrustSignalAlerts,
    ],
    [
      blockaidAlerts,
      signatureAlerts,
      transactionAlerts,
      accountTypeUpgrade,
      urlTrustSignalAlerts,
    ],
  );
}
