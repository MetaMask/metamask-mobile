import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectMultipleAddressScanResults } from '../../../../../selectors/phishingController';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import { extractSpenderFromApprovalData } from '../../../../../lib/address-scanning/address-scan-util';
import { Hex } from '@metamask/utils';

export function useAddressTrustSignalAlerts(): Alert[] {
  const transactionMetadata = useTransactionMetadataRequest();

  const addressesToScan = useMemo(() => {
    const addresses: { address: string; chainId: string }[] = [];

    if (!transactionMetadata?.chainId) {
      return addresses;
    }

    const chainId = transactionMetadata.chainId;

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

  const addressScanResults = useSelector((state: RootState) =>
    selectMultipleAddressScanResults(state, { addresses: addressesToScan }),
  );

  const alerts = useMemo(() => {
    const alertsList: Alert[] = [];

    addressScanResults.forEach(({ scanResult }) => {
      if (!scanResult) {
        return;
      }

      const resultType = scanResult.result_type;
      let severity: Severity | null = null;

      if (resultType === 'Malicious') {
        severity = Severity.Danger;
      } else if (resultType === 'Warning') {
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

      alertsList.push({
        key: alertKey,
        field: RowAlertKey.Blockaid, // Using Blockaid field as a generic security field
        message,
        title,
        severity,
        isBlocking: false,
      });
    });

    return alertsList;
  }, [addressScanResults]);

  return alerts;
}
