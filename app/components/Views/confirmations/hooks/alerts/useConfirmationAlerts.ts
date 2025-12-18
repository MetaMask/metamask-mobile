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
import { useOriginTrustSignalAlerts } from './useOriginTrustSignalAlerts';

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
    ],
  );
}
export default function useConfirmationAlerts(): Alert[] {
  const blockaidAlerts = useBlockaidAlerts();
  const signatureAlerts = useSignatureAlerts();
  const transactionAlerts = useTransactionAlerts();
  const accountTypeUpgrade = useAccountTypeUpgrade();
  const urlTrustSignalAlerts = useOriginTrustSignalAlerts();
  const addressTrustSignalAlerts = useAddressTrustSignalAlerts();

  return useMemo(
    () => [
      ...blockaidAlerts,
      ...signatureAlerts,
      ...transactionAlerts,
      ...accountTypeUpgrade,
      ...urlTrustSignalAlerts,
      ...addressTrustSignalAlerts,
    ],
    [
      blockaidAlerts,
      signatureAlerts,
      transactionAlerts,
      accountTypeUpgrade,
      urlTrustSignalAlerts,
      addressTrustSignalAlerts,
    ],
  );
}
