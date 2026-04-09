import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useEstimationFailed } from '../gas/useEstimationFailed';

export const useGasEstimateFailedAlert = (): Alert[] => {
  const estimationFailed = useEstimationFailed();

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
