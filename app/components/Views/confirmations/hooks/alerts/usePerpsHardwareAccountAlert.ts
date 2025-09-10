import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isHardwareAccount } from '../../../../../util/address';

export const MINIMUM_DEPOSIT_USD = 0;

export function usePerpsHardwareAccountAlert(): Alert[] {
  const {
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  const isHardwareWallet = isHardwareAccount(from ?? '');

  return useMemo(() => {
    if (!isHardwareWallet) {
      return [];
    }

    return [
      {
        key: AlertKeys.PerpsHardwareAccount,
        title: strings('alert_system.perps_hardware_account.title'),
        message: strings('alert_system.perps_hardware_account.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isHardwareWallet]);
}
