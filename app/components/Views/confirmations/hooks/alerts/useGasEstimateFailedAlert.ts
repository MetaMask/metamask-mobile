import { useMemo } from 'react';
import { SimulationErrorCode } from '@metamask/transaction-controller';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export const useGasEstimateFailedAlert = (): Alert[] => {
  const transactionMeta = useTransactionMetadataRequest();

  const simulationError = transactionMeta?.simulationData?.error;
  const isSimulationReverted =
    simulationError?.code === SimulationErrorCode.Reverted;

  return useMemo(() => {
    if (!isSimulationReverted) {
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
  }, [isSimulationReverted]);
};
