import { useMemo, useEffect } from 'react';
import { noop } from 'lodash';

import { useGasOptions } from '../../components/modals/gas-fee-modal/hooks/useGasOptions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';

export const useGasFeeMetrics = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { options } = useGasOptions({
    // Intentionally no-op because we run the hook to collect options info
    handleCloseModals: noop,
    setActiveModal: noop,
  });

  const presentedGasFeeOptions = useMemo(
    () =>
      options
        .filter((option) => option.metricKey)
        .map((option) => option.metricKey),
    [options],
  );
  const selectedGasFeeOption = useMemo(
    () => options.find((option) => option.isSelected)?.metricKey,
    [options],
  );
  const gasEstimationFailed = !transactionMetadata?.gasFeeEstimatesLoaded;

  useEffect(() => {
    setConfirmationMetric({
      properties: {
        gas_estimation_failed: gasEstimationFailed,
        gas_fee_presented: presentedGasFeeOptions,
        gas_fee_selected: selectedGasFeeOption,
      },
    });
  }, [
    gasEstimationFailed,
    presentedGasFeeOptions,
    selectedGasFeeOption,
    setConfirmationMetric,
  ]);
};
