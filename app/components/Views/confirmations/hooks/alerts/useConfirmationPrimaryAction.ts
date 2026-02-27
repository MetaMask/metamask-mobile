import { useMemo } from 'react';
import { ApprovalType } from '@metamask/controller-utils';
import { strings } from '../../../../../../locales/i18n';
import { useAlerts } from '../../context/alert-system-context';
import { useQRHardwareContext } from '../../context/qr-hardware-context/qr-hardware-context';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useIsTransactionPayLoading } from '../pay/useTransactionPayData';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export function useConfirmationPrimaryAction() {
  const { hasBlockingAlerts, hasUnconfirmedDangerAlerts, fieldAlerts } =
    useAlerts();
  const { isSigningQRObject, needsCameraPermission } = useQRHardwareContext();
  const { isTransactionValueUpdating } = useConfirmationContext();
  const isPayLoading = useIsTransactionPayLoading();
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  const isTransactionApproval =
    approvalRequest?.type === ApprovalType.Transaction;
  const isTransactionMetadataMissing =
    isTransactionApproval && !transactionMetadata;

  const label = useMemo(() => {
    if (isSigningQRObject) {
      return strings('confirm.qr_get_sign');
    }

    if (isPayLoading) {
      return strings('confirm.confirm');
    }

    if (hasUnconfirmedDangerAlerts) {
      return fieldAlerts.length > 1
        ? strings('alert_system.review_alerts')
        : strings('alert_system.review_alert');
    }

    if (hasBlockingAlerts) {
      return strings('alert_system.review_alerts');
    }

    return strings('confirm.confirm');
  }, [
    fieldAlerts.length,
    hasBlockingAlerts,
    hasUnconfirmedDangerAlerts,
    isPayLoading,
    isSigningQRObject,
  ]);

  const isDisabled = useMemo(
    () =>
      needsCameraPermission ||
      hasBlockingAlerts ||
      isTransactionValueUpdating ||
      isPayLoading ||
      isTransactionMetadataMissing,
    [
      hasBlockingAlerts,
      isPayLoading,
      isTransactionValueUpdating,
      needsCameraPermission,
      isTransactionMetadataMissing,
    ],
  );

  return {
    label,
    isDisabled,
  };
}
