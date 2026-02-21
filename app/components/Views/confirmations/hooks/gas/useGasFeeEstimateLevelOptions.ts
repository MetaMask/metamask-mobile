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
import { EMPTY_VALUE_STRING } from '../../constants/gas';

const HEX_ZERO = '0x0';

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
      // Skip adding the high option if it has the same fees as the medium option
      if (
        level === GasFeeEstimateLevel.High &&
        transactionGasFeeEstimates?.type === GasFeeEstimateType.FeeMarket
      ) {
        const mediumEstimates =
          transactionGasFeeEstimates[GasFeeEstimateLevel.Medium];
        const highEstimates =
          transactionGasFeeEstimates[GasFeeEstimateLevel.High];

        const hasSameFees =
          mediumEstimates?.maxFeePerGas === highEstimates?.maxFeePerGas &&
          mediumEstimates?.maxPriorityFeePerGas ===
            highEstimates?.maxPriorityFeePerGas;

        if (hasSameFees) {
          return;
        }
      }

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
        estimatedTime,
        isSelected: userFeeLevel === level,
        key: level,
        name: strings(`transactions.gas_modal.${level}`),
        onSelect: () => onGasFeeEstimateLevelClick(level),
        value: preciseNativeCurrencyFee || EMPTY_VALUE_STRING,
        valueInFiat: currentCurrencyFee || EMPTY_VALUE_STRING,
      });
    });
  }

  return options;
};
