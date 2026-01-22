import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../locales/i18n';
import { extractSpenderFromApprovalData } from '../../../../../lib/address-scanning/address-scan-util';
import { useAddressTrustSignals } from '../useAddressTrustSignals';
import {
  TrustSignalDisplayState,
  AddressTrustSignalRequest,
} from '../../types/trustSignals';
import { useApproveTransactionData } from '../useApproveTransactionData';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import {
  isRecognizedPermit,
  isPermitDaiRevoke,
  parseAndNormalizeSignTypedData,
} from '../../utils/signature';

export function useAddressTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();
  const { isRevoke: isTransactionRevoke, isLoading: isRevokeLoading } =
    useApproveTransactionData();
  const signatureRequest = useSignatureRequest();

  const isSignatureRevoke = useMemo(() => {
    if (!signatureRequest || !isRecognizedPermit(signatureRequest)) {
      return false;
    }

    const msgData = signatureRequest.messageParams?.data;
    if (!msgData || typeof msgData !== 'string') {
      return false;
    }

    try {
      const {
        domain: { verifyingContract },
        message: { allowed, tokenId, value },
      } = parseAndNormalizeSignTypedData(msgData);

      const isNFTPermit = tokenId !== undefined;
      if (isNFTPermit) {
        return false;
      }

      const isDaiRevoke = isPermitDaiRevoke(verifyingContract, allowed, value);
      const isZeroValueRevoke = value === '0' || value === 0;

      return isDaiRevoke || isZeroValueRevoke;
    } catch {
      return false;
    }
  }, [signatureRequest]);

  const isRevoke = Boolean(isTransactionRevoke) || isSignatureRevoke;

  const addressesToScan = useMemo((): AddressTrustSignalRequest[] => {
    if (!transactionMetadata?.chainId) {
      return [];
    }

    const chainId = transactionMetadata.chainId;
    const addresses: AddressTrustSignalRequest[] = [];

    if (transactionMetadata.txParams?.to) {
      addresses.push({
        address: transactionMetadata.txParams.to,
        chainId,
      });
    }

    if (transactionMetadata.txParams?.data) {
      const spenderAddress = extractSpenderFromApprovalData(
        transactionMetadata.txParams.data as unknown as Hex,
      );
      if (spenderAddress) {
        addresses.push({
          address: spenderAddress,
          chainId,
        });
      }
    }

    return addresses;
  }, [transactionMetadata]);

  const trustSignalResults = useAddressTrustSignals(addressesToScan);

  return useMemo(() => {
    if (addressesToScan.length === 0 || isRevokeLoading || isRevoke) {
      return [];
    }

    const alerts: Alert[] = [];
    let highestSeverity: Severity | null = null;

    trustSignalResults.forEach(({ state: trustSignalState }) => {
      if (trustSignalState === TrustSignalDisplayState.Malicious) {
        highestSeverity = Severity.Danger;
      } else if (
        trustSignalState === TrustSignalDisplayState.Warning &&
        highestSeverity !== Severity.Danger
      ) {
        highestSeverity = Severity.Warning;
      }
    });

    if (highestSeverity) {
      const isDanger = highestSeverity === Severity.Danger;

      const alertKey = isDanger
        ? AlertKeys.AddressTrustSignalMalicious
        : AlertKeys.AddressTrustSignalWarning;

      const message = isDanger
        ? strings('alert_system.address_trust_signal.malicious.message')
        : strings('alert_system.address_trust_signal.warning.message');

      const title = isDanger
        ? strings('alert_system.address_trust_signal.malicious.title')
        : strings('alert_system.address_trust_signal.warning.title');

      alerts.push({
        key: alertKey,
        field: RowAlertKey.InteractingWith,
        severity: highestSeverity,
        message,
        title,
        isBlocking: false,
      });
    }

    return alerts;
  }, [addressesToScan.length, isRevoke, isRevokeLoading, trustSignalResults]);
}
