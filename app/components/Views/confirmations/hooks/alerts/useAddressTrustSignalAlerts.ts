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

export function useAddressTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();

  const addressesToScan = useMemo((): AddressTrustSignalRequest[] => {
    if (!transactionMetadata?.chainId) {
      return [];
    }

    const chainId = transactionMetadata.chainId;
    const addresses: AddressTrustSignalRequest[] = [];

    // Add the "to" address (recipient)
    if (transactionMetadata.txParams?.to) {
      addresses.push({
        address: transactionMetadata.txParams.to,
        chainId,
      });
    }

    // Add spender address from approval transactions
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
    if (addressesToScan.length === 0) {
      return [];
    }

    const alerts: Alert[] = [];

    trustSignalResults.forEach(({ state: trustSignalState }) => {
      if (trustSignalState === TrustSignalDisplayState.Malicious) {
        alerts.push({
          key: AlertKeys.AddressTrustSignalMalicious,
          field: RowAlertKey.InteractingWith,
          severity: Severity.Danger,
          message: strings(
            'alert_system.address_trust_signal.malicious.message',
          ),
          title: strings('alert_system.address_trust_signal.malicious.title'),
          isBlocking: false,
        });
      } else if (trustSignalState === TrustSignalDisplayState.Warning) {
        alerts.push({
          key: AlertKeys.AddressTrustSignalWarning,
          field: RowAlertKey.InteractingWith,
          severity: Severity.Warning,
          message: strings('alert_system.address_trust_signal.warning.message'),
          title: strings('alert_system.address_trust_signal.warning.title'),
          isBlocking: false,
        });
      }
    });

    return alerts;
  }, [addressesToScan.length, trustSignalResults]);
}
