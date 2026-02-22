import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { LOWER_CASED_BURN_ADDRESSES } from '../../../../../constants/address';
import { strings } from '../../../../../../locales/i18n';
import {
  useNestedTransactionTransferRecipients,
  useTransferRecipient,
} from '../transactions/useTransferRecipient';

export function useBurnAddressAlert(): Alert[] {
  const transactionMetaRecipient = useTransferRecipient();
  const nestedTransactionRecipients = useNestedTransactionTransferRecipients();

  const hasBurnAddressRecipient = useMemo(() => {
    const hasBurnAddressInTransactionMetaRecipient =
      LOWER_CASED_BURN_ADDRESSES.includes(
        transactionMetaRecipient?.toLowerCase() ?? '',
      );
    const hasBurnAddressNestedTransactionRecipient =
      nestedTransactionRecipients.some((recipient) =>
        LOWER_CASED_BURN_ADDRESSES.includes(recipient.toLowerCase()),
      );

    return (
      hasBurnAddressInTransactionMetaRecipient ||
      hasBurnAddressNestedTransactionRecipient
    );
  }, [transactionMetaRecipient, nestedTransactionRecipients]);

  return useMemo(() => {
    if (!hasBurnAddressRecipient) {
      return [];
    }

    return [
      {
        key: AlertKeys.BurnAddress,
        field: RowAlertKey.BurnAddress,
        message: strings('alert_system.burn_address.message'),
        title: strings('alert_system.burn_address.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [hasBurnAddressRecipient]);
}
