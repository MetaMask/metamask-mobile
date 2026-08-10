import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  MessageParamsTyped,
  SignatureRequestType,
} from '@metamask/signature-controller';

import { strings } from '../../../../../../locales/i18n';
import { renderShortAddress } from '../../../../../util/address';
import { selectIsSecurityAlertsEnabled } from '../../../../../selectors/preferencesController';
import { extractSignatureAddresses } from '../../../../../lib/address-scanning/extract-signature-addresses';
import { parseTypedDataMessage } from '../../../../../lib/address-scanning/address-scan-util';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { TrustSignalDisplayState } from '../../types/trustSignals';
import { useAddressTrustSignals } from '../useAddressTrustSignals';
import { useSignatureRequest } from '../signatures/useSignatureRequest';

/**
 * Generate trust-signal alerts for the address fields of a typed-data signature.
 *
 * @returns Alerts for any flagged address in the signature.
 */
export function useSignatureAddressAlerts(): Alert[] {
  const signatureRequest = useSignatureRequest();
  const isSecurityAlertsEnabled = useSelector(selectIsSecurityAlertsEnabled);

  const {
    addresses: signatureAddresses,
    fields,
    overflow,
  } = useMemo(() => {
    const empty = {
      addresses: [] as string[],
      fields: {} as Record<string, string>,
      overflow: false,
    };

    if (!signatureRequest || !isSecurityAlertsEnabled) {
      return empty;
    }

    const version = (signatureRequest.messageParams as MessageParamsTyped)
      ?.version;
    const isTypedSignV3V4 =
      signatureRequest.type === SignatureRequestType.TypedSign &&
      (version === SignTypedDataVersion.V3 ||
        version === SignTypedDataVersion.V4);

    const msgData = signatureRequest.messageParams?.data;
    if (!isTypedSignV3V4 || typeof msgData !== 'string') {
      return empty;
    }

    const parsed = parseTypedDataMessage(msgData);
    if (!parsed) {
      return empty;
    }

    const signer = signatureRequest.messageParams?.from;
    return extractSignatureAddresses(parsed, {
      exclude: typeof signer === 'string' ? [signer] : [],
    });
  }, [signatureRequest, isSecurityAlertsEnabled]);

  const chainId = signatureRequest?.chainId;

  const trustSignalRequests = useMemo(
    () =>
      chainId
        ? signatureAddresses.map((address) => ({ address, chainId }))
        : [],
    [signatureAddresses, chainId],
  );

  const trustSignals = useAddressTrustSignals(trustSignalRequests);

  return useMemo(() => {
    const alerts: Alert[] = [];

    // Surface a caution when the message could not be fully scanned.
    if (overflow) {
      alerts.push({
        key: AlertKeys.SignatureAddressScanIncomplete,
        field: RowAlertKey.InteractingWith,
        severity: Severity.Warning,
        message: strings(
          'alert_system.signature_address_scan.incomplete.message',
        ),
        title: strings('alert_system.signature_address_scan.incomplete.title'),
        isBlocking: false,
      });
    }

    if (signatureAddresses.length === 0) {
      return alerts;
    }

    // Report every flagged address, naming its field, so no malicious or
    // warning address in the request is hidden behind another.
    trustSignals.forEach(({ state }, index) => {
      const address = signatureAddresses[index];

      if (state === TrustSignalDisplayState.Malicious) {
        alerts.push({
          key: `${AlertKeys.SignatureAddressTrustSignalMalicious}_${address}`,
          field: RowAlertKey.InteractingWith,
          severity: Severity.Danger,
          message: strings(
            'alert_system.signature_address_scan.malicious.message',
            { field: fields[address], address: renderShortAddress(address) },
          ),
          title: strings('alert_system.signature_address_scan.malicious.title'),
          isBlocking: false,
        });
      } else if (state === TrustSignalDisplayState.Warning) {
        alerts.push({
          key: `${AlertKeys.SignatureAddressTrustSignalWarning}_${address}`,
          field: RowAlertKey.InteractingWith,
          severity: Severity.Warning,
          message: strings(
            'alert_system.signature_address_scan.warning.message',
            { field: fields[address], address: renderShortAddress(address) },
          ),
          title: strings('alert_system.signature_address_scan.warning.title'),
          isBlocking: false,
        });
      }
    });

    return alerts;
  }, [signatureAddresses, fields, overflow, trustSignals]);
}
