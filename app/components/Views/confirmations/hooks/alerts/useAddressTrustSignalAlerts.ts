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

/** An address to scan with the alert field it should map to. */
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

  // Extract spender from approval data (if any).
  // This is computed outside useMemo so it can also be used for revoke suppression.
  const spenderAddress = useMemo(
    () =>
      transactionMetadata?.txParams?.data
        ? extractSpenderFromApprovalData(
            transactionMetadata.txParams.data as unknown as Hex,
          )
        : undefined,
    [transactionMetadata?.txParams?.data],
  );

  // Whether the transaction has data beyond '0x' (i.e. is a contract interaction).
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

    // Determine if the transfer recipient differs from txParams.to
    // (e.g. for token transfers, `to` is the token contract, the real recipient is in the data)
    const hasTransferRecipient =
      transferRecipient && toAddress && transferRecipient !== toAddress;

    if (toAddress) {
      // For approvals/contract interactions: the `to` address is the contract → InteractingWith
      // For simple sends: the `to` address is the recipient → FromToAddress
      // For token transfers with a different recipient: `to` is the contract → InteractingWith
      const isContractInteraction =
        spenderAddress || hasTransferRecipient || hasData;
      const toField = isContractInteraction
        ? RowAlertKey.InteractingWith
        : RowAlertKey.FromToAddress;

      addresses.push({ address: toAddress, chainId, alertField: toField });
    }

    // Add the transfer recipient (for token transfers where recipient != to)
    if (hasTransferRecipient) {
      addresses.push({
        address: transferRecipient,
        chainId,
        alertField: RowAlertKey.FromToAddress,
      });
    }

    // Add the spender address (for approvals)
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

  // Always suppress for confirmed revokes (transaction or signature).
  // Only gate on isRevokeLoading when a spender was extracted, meaning
  // the transaction is an actual approval that could be a revoke.
  // For non-approval contract interactions and simple transfers,
  // useApproveTransactionData may return isLoading: true permanently
  // (because the data doesn't match any known approval pattern),
  // so we must not gate on isRevokeLoading in those cases.
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
