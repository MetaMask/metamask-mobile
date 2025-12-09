import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export const useGasEstimateFailedAlert = (): Alert[] => {
  const transactionMeta = useTransactionMetadataRequest();

  const estimationFailed = Boolean(transactionMeta?.simulationFails);

  return useMemo(() => {
    if (!estimationFailed) {
      return [];
    }

    return [
      {
        isBlocking: false,
        key: AlertKeys.GasEstimateFailed,
        field: RowAlertKey.EstimatedFee,
        message: strings('alert_system.gas_estimate_failed.message'),
        title: strings('alert_system.gas_estimate_failed.title'),
        severity: Severity.Warning,
      },
    ];
  }, [estimationFailed]);
};
