import { useCallback, useMemo } from 'react';
import {
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  TransactionEnvelopeType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { MODALS } from '../constants';
import { type GasOption } from '../types';

const HEX_ZERO = '0x0';

export const useAdvancedGasFeeOption = ({
  setActiveModal,
}: {
  setActiveModal: (modal: string) => void;
}): GasOption[] => {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const {
    dappSuggestedGasFees,
    gasFeeEstimates: transactionGasFeeEstimates,
    userFeeLevel,
    txParams: {
      type: transactionEnvelopeType,
      gas: txParamsGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasPrice: txParamsGasPrice,
    },
  } = transactionMeta;

  const { calculateGasEstimate } = useFeeCalculations(transactionMeta);

  const onAdvancedGasFeeClick = useCallback(() => {
    if (transactionEnvelopeType === TransactionEnvelopeType.legacy) {
      setActiveModal(MODALS.ADVANCED_GAS_PRICE);
    } else {
      setActiveModal(MODALS.ADVANCED_EIP1559);
    }
  }, [transactionEnvelopeType, setActiveModal]);

  const isCustomUserFeeLevelSelected = userFeeLevel === 'custom';

  const isDappSuggestedGasFeeSelected = useMemo(() => !!(
      userFeeLevel === 'dappSuggested' ||
      // TODO: This is a temporary fix to handle the case where the user fee level is undefined but the dapp suggested gas fees exist
      // Task will be to create a new issue to handle this
      (userFeeLevel === undefined && dappSuggestedGasFees)
    ), [userFeeLevel, dappSuggestedGasFees]);

  const isAnyGasFeeEstimateLevelSelected = useMemo(() => Object.values(GasFeeEstimateLevel).some(
      (level) => userFeeLevel === level,
    ), [userFeeLevel]);

  const isGasPriceEstimateSelected = useMemo(() => (
      userFeeLevel === 'medium' &&
      transactionGasFeeEstimates?.type === GasFeeEstimateType.GasPrice
    ), [userFeeLevel, transactionGasFeeEstimates]);

  const isAdvancedGasFeeSelected = useMemo(() => (
      (!isDappSuggestedGasFeeSelected &&
        !isAnyGasFeeEstimateLevelSelected &&
        !isGasPriceEstimateSelected) ||
      isCustomUserFeeLevelSelected
    ), [
    isDappSuggestedGasFeeSelected,
    isAnyGasFeeEstimateLevelSelected,
    isGasPriceEstimateSelected,
    isCustomUserFeeLevelSelected,
  ]);

  let value = '';
  let valueInFiat = '--';

  if (isAdvancedGasFeeSelected) {
    const feePerGas = maxFeePerGas || HEX_ZERO;
    let gasPrice = HEX_ZERO;
    let gas = transactionMeta.gasLimitNoBuffer || HEX_ZERO;
    let shouldUseEIP1559FeeLogic = true;
    const priorityFeePerGas = maxPriorityFeePerGas || HEX_ZERO;

    if (transactionEnvelopeType === TransactionEnvelopeType.legacy) {
      gasPrice = txParamsGasPrice || HEX_ZERO;
      gas = txParamsGas || HEX_ZERO;
      shouldUseEIP1559FeeLogic = false;
    }

    const { currentCurrencyFee, preciseNativeCurrencyFee } =
      calculateGasEstimate({
        feePerGas,
        priorityFeePerGas,
        gas,
        shouldUseEIP1559FeeLogic,
        gasPrice,
      });

    value = preciseNativeCurrencyFee || '--';
    valueInFiat = currentCurrencyFee || '';
  }

  return [
    {
      emoji: '⚙️',
      estimatedTime: '',
      isSelected: isAdvancedGasFeeSelected,
      key: 'advanced',
      name: strings('transactions.gas_modal.advanced'),
      onSelect: onAdvancedGasFeeClick,
      value,
      valueInFiat,
    },
  ];
};
