import { useCallback, useMemo } from 'react';
import {
  GasFeeEstimateType,
  TransactionEnvelopeType,
  type TransactionMeta,
  type GasPriceGasFeeEstimates,
} from '@metamask/transaction-controller';
import { type GasFeeEstimates } from '@metamask/gas-fee-controller';
import { strings } from '../../../../../../../../locales/i18n';
import { updateTransactionGasFees } from '../../../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useGasFeeEstimates } from '../../../../hooks/gas/useGasFeeEstimates';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { type GasOption } from '../types';
import { GasOptionIcon } from '../constants';

const HEX_ZERO = '0x0';

export const useGasPriceEstimateOption = ({
  handleCloseModals,
}: {
  handleCloseModals: () => void;
}): GasOption[] => {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { calculateGasEstimate } = useFeeCalculations(transactionMeta);

  const {
    gasFeeEstimates,
    id,
    networkClientId,
    userFeeLevel,
    txParams: { type: transactionEnvelopeType },
  } = transactionMeta;

  const { gasFeeEstimates: networkGasFeeEstimates } = useGasFeeEstimates(
    networkClientId,
  ) as {
    gasFeeEstimates: GasFeeEstimates;
  };

  const transactionGasFeeEstimates = gasFeeEstimates as GasPriceGasFeeEstimates;

  const isGasPriceEstimateSelected = useMemo(
    () =>
      userFeeLevel === 'medium' &&
      transactionGasFeeEstimates?.type === GasFeeEstimateType.GasPrice,
    [userFeeLevel, transactionGasFeeEstimates],
  );

  const shouldIncludeGasPriceEstimateOption = useMemo(
    () =>
      transactionGasFeeEstimates?.type === GasFeeEstimateType.GasPrice &&
      networkGasFeeEstimates,
    [transactionGasFeeEstimates, networkGasFeeEstimates],
  );

  const onGasPriceEstimateLevelClick = useCallback(() => {
    let gasPropertiesToUpdate;
    if (transactionEnvelopeType === TransactionEnvelopeType.legacy) {
      gasPropertiesToUpdate = {
        gasPrice: transactionGasFeeEstimates?.gasPrice,
      };
    } else {
      gasPropertiesToUpdate = {
        maxFeePerGas: transactionGasFeeEstimates?.gasPrice,
        maxPriorityFeePerGas: transactionGasFeeEstimates?.gasPrice,
      };
    }

    updateTransactionGasFees(id, {
      userFeeLevel: 'medium',
      ...gasPropertiesToUpdate,
    });
    handleCloseModals();
  }, [
    id,
    transactionGasFeeEstimates,
    transactionEnvelopeType,
    handleCloseModals,
  ]);

  if (!shouldIncludeGasPriceEstimateOption) {
    return [];
  }

  const options: GasOption[] = [];

  let feePerGas = HEX_ZERO;
  let gasPrice = HEX_ZERO;
  const gas = transactionMeta.gasLimitNoBuffer || HEX_ZERO;
  let shouldUseEIP1559FeeLogic = false;
  let priorityFeePerGas = HEX_ZERO;

  if (transactionEnvelopeType === TransactionEnvelopeType.legacy) {
    gasPrice = transactionGasFeeEstimates?.gasPrice;
  } else {
    feePerGas = transactionGasFeeEstimates?.gasPrice;
    priorityFeePerGas = transactionGasFeeEstimates?.gasPrice;
    shouldUseEIP1559FeeLogic = true;
  }

  const { currentCurrencyFee, preciseNativeCurrencyFee } = calculateGasEstimate(
    {
      feePerGas,
      priorityFeePerGas,
      gas,
      shouldUseEIP1559FeeLogic,
      gasPrice,
    },
  );

  options.push({
    emoji: GasOptionIcon.GAS_PRICE,
    estimatedTime: undefined,
    isSelected: isGasPriceEstimateSelected,
    key: 'gasPrice',
    name: strings(`transactions.gas_modal.gas_price_estimate`),
    onSelect: () => onGasPriceEstimateLevelClick(),
    value: preciseNativeCurrencyFee || '--',
    valueInFiat: currentCurrencyFee || '',
  });

  return options;
};
