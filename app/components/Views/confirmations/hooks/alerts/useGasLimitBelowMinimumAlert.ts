import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { MIN_GAS_LIMIT } from '../../constants/gas';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export const useGasLimitBelowMinimumAlert = (): Alert[] => {
  const transactionMetadata = useTransactionMetadataRequest();
  const gas = transactionMetadata?.txParams.gas;

  return useMemo(() => {
    if (!gas || BigInt(gas) >= MIN_GAS_LIMIT) {
      return [];
    }

    return [
      {
        isBlocking: true,
        key: AlertKeys.GasLimitBelowMinimum,
        field: RowAlertKey.EstimatedFee,
        message: strings('alert_system.gas_limit_below_minimum.message'),
        title: strings('alert_system.gas_limit_below_minimum.title'),
        severity: Severity.Warning,
      },
    ];
  }, [gas]);
};
