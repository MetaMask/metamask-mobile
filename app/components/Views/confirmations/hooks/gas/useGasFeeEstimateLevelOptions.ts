import { useCallback, useMemo } from 'react';
import {
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  type TransactionMeta,
  type GasFeeEstimates as TransactionGasFeeEstimates,
} from '@metamask/transaction-controller';
import { type GasFeeEstimates } from '@metamask/gas-fee-controller';

import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import { toHumanEstimatedTimeRange } from '../../utils/time';
import { useFeeCalculations } from './useFeeCalculations';
import { updateTransactionGasFees } from '../../../../../util/transaction-controller';
import { type GasOption } from '../../types/gas';
import { GasOptionIcon } from '../../constants/gas';

const HEX_ZERO = '0x0';

const GasEstimateFeeLevelEmojis = {
  [GasFeeEstimateLevel.Low]: GasOptionIcon.LOW,
  [GasFeeEstimateLevel.Medium]: GasOptionIcon.MEDIUM,
  [GasFeeEstimateLevel.High]: GasOptionIcon.HIGH,
};

export const useGasFeeEstimateLevelOptions = ({
  handleCloseModals,
}: {
  handleCloseModals: () => void;
}): GasOption[] => {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { calculateGasEstimate } = useFeeCalculations(transactionMeta);
  const { gasFeeEstimates: networkGasFeeEstimates } = useGasFeeEstimates(
    transactionMeta.networkClientId,
  ) as {
    gasFeeEstimates: GasFeeEstimates;
  };

  const { gasFeeEstimates, id, userFeeLevel } = transactionMeta;

  const transactionGasFeeEstimates =
    gasFeeEstimates as TransactionGasFeeEstimates;

  const shouldIncludeGasFeeEstimateLevelOptions = useMemo(
    () =>
      (transactionGasFeeEstimates?.type === GasFeeEstimateType.FeeMarket ||
        transactionGasFeeEstimates?.type === GasFeeEstimateType.Legacy) &&
      networkGasFeeEstimates,
    [transactionGasFeeEstimates, networkGasFeeEstimates],
  );

  const onGasFeeEstimateLevelClick = useCallback(
    (level: GasFeeEstimateLevel) => {
      updateTransactionGasFees(id, {
        userFeeLevel: level,
      });
      handleCloseModals();
    },
    [id, handleCloseModals],
  );

  const options: GasOption[] = [];

  if (shouldIncludeGasFeeEstimateLevelOptions) {
    Object.values(GasFeeEstimateLevel).forEach((level) => {
      const estimatedTime = toHumanEstimatedTimeRange(
        networkGasFeeEstimates[level].minWaitTimeEstimate,
        networkGasFeeEstimates[level].maxWaitTimeEstimate,
      );

      let feePerGas = HEX_ZERO;
      let gasPrice = HEX_ZERO;
      const gas = transactionMeta.gasLimitNoBuffer || HEX_ZERO;
      let shouldUseEIP1559FeeLogic = true;
      let priorityFeePerGas = HEX_ZERO;

      switch (transactionGasFeeEstimates?.type) {
        case GasFeeEstimateType.FeeMarket:
          feePerGas = transactionGasFeeEstimates?.[level]?.maxFeePerGas;
          priorityFeePerGas =
            transactionGasFeeEstimates?.[level]?.maxPriorityFeePerGas;
          break;
        case GasFeeEstimateType.Legacy:
          gasPrice = transactionGasFeeEstimates?.[level];
          shouldUseEIP1559FeeLogic = false;
          break;
        default:
          gasPrice = transactionGasFeeEstimates?.gasPrice;
          shouldUseEIP1559FeeLogic = false;
          break;
      }

      const { currentCurrencyFee, preciseNativeCurrencyFee } =
        calculateGasEstimate({
          feePerGas,
          priorityFeePerGas,
          gasPrice,
          gas,
          shouldUseEIP1559FeeLogic,
        });

      options.push({
        emoji: GasEstimateFeeLevelEmojis[level],
        estimatedTime,
        isSelected: userFeeLevel === level,
        key: level,
        name: strings(`transactions.gas_modal.${level}`),
        onSelect: () => onGasFeeEstimateLevelClick(level),
        value: preciseNativeCurrencyFee || '--',
        valueInFiat: currentCurrencyFee || '',
      });
    });
  }

  return options;
};
