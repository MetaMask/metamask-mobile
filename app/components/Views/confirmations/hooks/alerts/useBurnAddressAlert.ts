import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { ZERO_ADDRESS, DEAD_ADDRESS } from '../../../../../constants/address';
import { strings } from '../../../../../../locales/i18n';
import {
  useNestedTransactionTransferRecipients,
  useTransferRecipient,
} from '../transactions/useTransferRecipient';

function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

function isDeadAddress(address: string): boolean {
  return address.toLowerCase() === DEAD_ADDRESS.toLowerCase();
}

export function useBurnAddressAlert(): Alert[] {
  const transactionMetaRecipient = useTransferRecipient();
  const nestedTransactionRecipients = useNestedTransactionTransferRecipients();

  const hasZeroAddressRecipient = useMemo(() => {
    const recipientIsZero = transactionMetaRecipient
      ? isZeroAddress(transactionMetaRecipient)
      : false;
    const nestedHasZero = nestedTransactionRecipients.some(isZeroAddress);
    return recipientIsZero || nestedHasZero;
  }, [transactionMetaRecipient, nestedTransactionRecipients]);

  const hasDeadAddressRecipient = useMemo(() => {
    const recipientIsDead = transactionMetaRecipient
      ? isDeadAddress(transactionMetaRecipient)
      : false;
    const nestedHasDead = nestedTransactionRecipients.some(isDeadAddress);
    return recipientIsDead || nestedHasDead;
  }, [transactionMetaRecipient, nestedTransactionRecipients]);

  return useMemo(() => {
    if (hasZeroAddressRecipient) {
      return [
        {
          key: AlertKeys.BurnAddress,
          field: RowAlertKey.FromToAddress,
          message: strings('alert_system.burn_address.message'),
          title: strings('alert_system.burn_address.title'),
          severity: Severity.Danger,
          isBlocking: true,
        },
      ];
    }

    if (hasDeadAddressRecipient) {
      return [
        {
          key: AlertKeys.BurnAddress,
          field: RowAlertKey.FromToAddress,
          message: strings('alert_system.burn_address.message'),
          title: strings('alert_system.burn_address.title'),
          severity: Severity.Danger,
          isBlocking: false,
        },
      ];
    }

    return [];
  }, [hasZeroAddressRecipient, hasDeadAddressRecipient]);
}
