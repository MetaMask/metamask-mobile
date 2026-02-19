import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
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

interface AddressToScan extends AddressTrustSignalRequest {
  alertField: RowAlertKey;
}

export function useAddressTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();
  const transferRecipient = useTransferRecipient();
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

  const spenderAddress = useMemo(
    () =>
      transactionMetadata?.txParams?.data
        ? extractSpenderFromApprovalData(
            transactionMetadata.txParams.data as unknown as Hex,
          )
        : undefined,
    [transactionMetadata?.txParams?.data],
  );

  const hasData = Boolean(
    transactionMetadata?.txParams?.data &&
      transactionMetadata.txParams.data !== '0x',
  );

  const addressesToScan = useMemo((): AddressToScan[] => {
    if (!transactionMetadata?.chainId) {
      return [];
    }

    const chainId = transactionMetadata.chainId;
    const toAddress = transactionMetadata.txParams?.to;
    const addresses: AddressToScan[] = [];

    const hasTransferRecipient =
      transferRecipient &&
      toAddress &&
      transferRecipient.toLowerCase() !== toAddress.toLowerCase();

    if (toAddress) {
      const isContractInteraction =
        spenderAddress || hasTransferRecipient || hasData;
      const toField = isContractInteraction
        ? RowAlertKey.InteractingWith
        : RowAlertKey.FromToAddress;

      addresses.push({ address: toAddress, chainId, alertField: toField });
    }

    if (hasTransferRecipient) {
      addresses.push({
        address: transferRecipient,
        chainId,
        alertField: RowAlertKey.FromToAddress,
      });
    }

    if (spenderAddress) {
      addresses.push({
        address: spenderAddress,
        chainId,
        alertField: RowAlertKey.Spender,
      });
    }

    return addresses;
  }, [transactionMetadata, transferRecipient, spenderAddress, hasData]);

  const trustSignalResults = useAddressTrustSignals(addressesToScan);

  // Suppress alerts for revokes. Only gate on isRevokeLoading when a spender
  // exists — non-approval interactions may stay loading permanently.
  const shouldSuppressForRevoke =
    isRevoke || (Boolean(spenderAddress) && isRevokeLoading);

  return useMemo(() => {
    if (addressesToScan.length === 0 || shouldSuppressForRevoke) {
      return [];
    }

    const alerts: Alert[] = [];

    trustSignalResults.forEach(({ state: trustSignalState }, index) => {
      let severity: Severity | null = null;

      if (trustSignalState === TrustSignalDisplayState.Malicious) {
        severity = Severity.Danger;
      } else if (trustSignalState === TrustSignalDisplayState.Warning) {
        severity = Severity.Warning;
      }

      if (!severity) {
        return;
      }

      const isDanger = severity === Severity.Danger;

      const baseKey = isDanger
        ? AlertKeys.AddressTrustSignalMalicious
        : AlertKeys.AddressTrustSignalWarning;

      const alertKey = `${baseKey}_${addressesToScan[index].alertField}`;

      const message = isDanger
        ? strings('alert_system.address_trust_signal.malicious.message')
        : strings('alert_system.address_trust_signal.warning.message');

      const title = isDanger
        ? strings('alert_system.address_trust_signal.malicious.title')
        : strings('alert_system.address_trust_signal.warning.title');

      alerts.push({
        key: alertKey,
        field: addressesToScan[index].alertField,
        severity,
        message,
        title,
        isBlocking: false,
      });
    });

    return alerts;
  }, [addressesToScan, shouldSuppressForRevoke, trustSignalResults]);
}
