import { isEIP1559Transaction, TransactionParams } from '@metamask/transaction-controller';
import React from 'react';
import { decimalToHex } from '../../../../../../../../util/conversions';
import { updateTransactionGasFees } from '../../../../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import UpdateEIP1559Tx from '../../../../../legacy/components/UpdateEIP1559Tx';
import BottomModal from '../../../../UI/bottom-modal';

const GasFeeModals = (
  { gasModalIsOpen, setGasModalIsOpen } :
  {
    gasModalIsOpen: boolean,
    setGasModalIsOpen: (isOpen: boolean) => void,
  }) => {
  const transactionMetadata = useTransactionMetadataRequest();
  const isEIP1559 = isEIP1559Transaction(transactionMetadata?.txParams as TransactionParams);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSave = async (transactionObject: any) => {
    if (transactionMetadata?.id) {
      const updatedGasFees = {
        ...((transactionObject.suggestedGasLimit && transactionObject.userFeeLevel === 'custom') ?
          { gasLimit: `0x${decimalToHex(transactionObject.suggestedGasLimit)}` } :
          {}
        ),
        ...((transactionObject.suggestedMaxFeePerGas && transactionObject.userFeeLevel === 'custom') ?
          { maxFeePerGas: `0x${decimalToHex(transactionObject.suggestedMaxFeePerGas * 10 ** 9)}` } :
          {}
        ),
        ...((transactionObject.suggestedMaxPriorityFeePerGas && transactionObject.userFeeLevel === 'custom') ?
          { maxPriorityFeePerGas: `0x${decimalToHex(transactionObject.suggestedMaxPriorityFeePerGas * 10 ** 9)}` } :
          {}
        ),
        userFeeLevel: transactionObject.userFeeLevel,
      };
      await updateTransactionGasFees(transactionMetadata.id, updatedGasFees);
      setGasModalIsOpen(false);
    }
  };

  // TODO: Remove this once we implement the legacy tx modal
  if (!isEIP1559) {
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
