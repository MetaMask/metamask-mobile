import { useCallback, useMemo } from 'react';
import { type TransactionMeta } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { MMM_ORIGIN } from '../../../../constants/confirmations';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { updateTransactionGasFees } from '../../../../../../../util/transaction-controller';
import { type GasOption } from '../types';

const HEX_ZERO = '0x0';

export const useDappSuggestedGasFeeOption = ({
  handleCloseModals,
}: {
  handleCloseModals: () => void;
}): GasOption[] => {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { calculateGasEstimate } = useFeeCalculations(transactionMeta);

  const { dappSuggestedGasFees, id, origin, userFeeLevel } = transactionMeta;

  const onDappSuggestedGasFeeClick = useCallback(() => {
    updateTransactionGasFees(id, {
      userFeeLevel: 'dappSuggested',
      ...(dappSuggestedGasFees || {}),
    });
    handleCloseModals();
  }, [id, dappSuggestedGasFees, handleCloseModals]);

  const shouldIncludeDappSuggestedGasFeeOption = useMemo(() => origin !== MMM_ORIGIN && dappSuggestedGasFees, [origin, dappSuggestedGasFees]);

  const isDappSuggestedGasFeeSelected = useMemo(() => !!(
      userFeeLevel === 'dappSuggested' ||
      // TODO: This is a temporary fix to handle the case where the user fee level is undefined but the dapp suggested gas fees exist
      // Task will be to create a new issue to handle this
      (userFeeLevel === undefined && dappSuggestedGasFees)
    ), [userFeeLevel, dappSuggestedGasFees]);

  const options: GasOption[] = [];

  if (shouldIncludeDappSuggestedGasFeeOption) {
    let feePerGas = HEX_ZERO;
    let gasPrice = HEX_ZERO;
    let gas = transactionMeta.gasLimitNoBuffer || HEX_ZERO;
    let shouldUseEIP1559FeeLogic = true;
    let priorityFeePerGas = HEX_ZERO;

    if (
      dappSuggestedGasFees?.maxFeePerGas &&
      dappSuggestedGasFees?.maxPriorityFeePerGas
    ) {
      feePerGas = dappSuggestedGasFees?.maxFeePerGas;
      priorityFeePerGas = dappSuggestedGasFees?.maxPriorityFeePerGas;
    } else if (dappSuggestedGasFees?.gasPrice) {
      gasPrice = dappSuggestedGasFees?.gasPrice;
      gas = dappSuggestedGasFees?.gas || HEX_ZERO;
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

    options.push({
      emoji: '🌐',
      estimatedTime: undefined,
      isSelected: isDappSuggestedGasFeeSelected,
      key: 'site_suggested',
      name: strings('transactions.gas_modal.site_suggested'),
      onSelect: onDappSuggestedGasFeeClick,
      value: preciseNativeCurrencyFee || '--',
      valueInFiat: currentCurrencyFee || '',
    });
  }

  return options;
};
