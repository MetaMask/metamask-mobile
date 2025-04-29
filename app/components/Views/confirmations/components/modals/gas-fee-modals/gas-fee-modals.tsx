import { TransactionMeta } from '@metamask/transaction-controller';
import React from 'react';
import { decimalToHex } from '../../../../../../util/conversions';
import { updateTransactionGasFees } from '../../../../../../util/transaction-controller';
import { useSupportsEIP1559 } from '../../../hooks/transactions/useSupportsEIP1559';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import UpdateEIP1559Tx from '../../../legacy/components/UpdateEIP1559Tx';
import BottomModal from '../../UI/bottom-modal';

const GasFeeModals = (
  { gasModalIsOpen, setGasModalIsOpen } :
  {
    gasModalIsOpen: boolean,
    setGasModalIsOpen: (isOpen: boolean) => void,
  }) => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { supportsEIP1559 } = useSupportsEIP1559(transactionMetadata as TransactionMeta);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSave = async (transactionObject: any) => {
    if (transactionMetadata?.id) {
      // Define type for updatedGasFees to avoid implicit any
      const updatedGasFees: {
        gasLimit?: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
        userFeeLevel: string;
      } = {
        userFeeLevel: transactionObject.userFeeLevel,
      };

      if (transactionObject.userFeeLevel === 'custom') {
        if (transactionObject.suggestedGasLimit) {
          updatedGasFees.gasLimit = `0x${decimalToHex(transactionObject.suggestedGasLimit)}`;
        }
        if (transactionObject.suggestedMaxFeePerGas) {
          updatedGasFees.maxFeePerGas = `0x${decimalToHex(transactionObject.suggestedMaxFeePerGas * 10 ** 9)}`;
        }
        if (transactionObject.suggestedMaxPriorityFeePerGas) {
          updatedGasFees.maxPriorityFeePerGas = `0x${decimalToHex(transactionObject.suggestedMaxPriorityFeePerGas * 10 ** 9)}`;
        }
      }

      await updateTransactionGasFees(transactionMetadata.id, updatedGasFees);
      setGasModalIsOpen(false);
    }
  };

  // TODO: Remove this once we implement the legacy tx modal
  if (!supportsEIP1559) {
    return null;
  }

  return (
    <BottomModal visible={gasModalIsOpen} onClose={() => setGasModalIsOpen(false)}>
      <UpdateEIP1559Tx
        gas={transactionMetadata?.txParams?.gas}
        onSave={onSave}
        onCancel={() => setGasModalIsOpen(false)}
        existingGas={transactionMetadata?.txParams?.gas}
        isCancel={false}
        dappSuggestedGas
        dontIgnoreOptions
        defaultStopUpdateGas
        isRedesignedTransaction
      />
    </BottomModal>
  );
};

export default GasFeeModals;
