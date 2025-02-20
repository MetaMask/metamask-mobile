import { TransactionParams } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { decimalToHex } from '../../../../util/conversions';
import { selectSwapsApprovalTransaction } from '../../../../reducers/swaps';
import { Quote, TxParams } from '@metamask/swaps-controller/dist/types';
import { selectChainId , selectIsEIP1559Network } from '../../../../selectors/networkController';
import { getGasFeeEstimatesForTransaction } from './gas';
import { Hex } from '@metamask/utils';

interface TemporarySmartTransactionGasFees {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  gas: string;
  value: string;
}

const createSignedTransactions = async (
  unsignedTransaction: Partial<TransactionParams> & { from: string; chainId: string },
  fees: TemporarySmartTransactionGasFees[],
  areCancelTransactions?: boolean,
): Promise<string[]> => {
  const { TransactionController } = Engine.context;

  const unsignedTransactionsWithFees = fees.map((fee) => {
    const unsignedTransactionWithFees = {
      ...unsignedTransaction,
      maxFeePerGas: decimalToHex(fee.maxFeePerGas).toString(),
      maxPriorityFeePerGas: decimalToHex(fee.maxPriorityFeePerGas).toString(),
      gas: areCancelTransactions
        ? decimalToHex(21000).toString() // It has to be 21000 for cancel transactions, otherwise the API would reject it.
        : unsignedTransaction.gas,
      value: unsignedTransaction.value,
    };
    if (areCancelTransactions) {
      unsignedTransactionWithFees.to = unsignedTransactionWithFees.from;
      unsignedTransactionWithFees.data = '0x';
    }
    return unsignedTransactionWithFees;
  });
  const signedTransactions = await TransactionController.approveTransactionsWithSameNonce(
    unsignedTransactionsWithFees,
  ) as string[]; // fees is an array, so we will get an array back
  return signedTransactions;
};



const submitSmartTransaction = async ({
  unsignedTransaction,
  smartTransactionFees,
  chainId,
  isEIP1559Network,
  gasEstimates,
}: {
  unsignedTransaction: Partial<TransactionParams> & { from: string; chainId: string };
  smartTransactionFees: {
    fees: TemporarySmartTransactionGasFees[];
    cancelFees: TemporarySmartTransactionGasFees[];
  };
  chainId: Hex;
  isEIP1559Network: boolean;
  gasEstimates: {
    gasPrice: string;
    medium: string;
  };
}) => {
  const { SmartTransactionsController } = Engine.context;

  const gasFeeEstimates = await getGasFeeEstimatesForTransaction(
    {...unsignedTransaction, chainId},
    gasEstimates,
    { chainId, isEIP1559Network },
  );

  const unsignedTransactionWithGasFeeEstimates = {
    ...unsignedTransaction,
    ...gasFeeEstimates,
  };

  const signedTransactions = await createSignedTransactions(
    unsignedTransactionWithGasFeeEstimates,
    smartTransactionFees.fees,
  );

  try {
    const response = await SmartTransactionsController.submitSignedTransactions({
      signedTransactions,
      txParams: unsignedTransactionWithGasFeeEstimates,
      // The "signedCanceledTransactions" parameter is still expected by the STX controller but is no longer used.
      // So we are passing an empty array. The parameter may be deprecated in a future update.
      signedCanceledTransactions: [],
    });
    // Returns e.g.: { uuid: 'dP23W7c2kt4FK9TmXOkz1UM2F20' }
    return response.uuid;
  } catch (error) {
    console.error(error);
  }
};


export const useSwapsSmartTransactions = ({ tradeTransaction, gasEstimates }: { tradeTransaction: Quote['trade'], gasEstimates: {
  gasPrice: string;
  medium: string;
} }) => {
  const chainId = useSelector(selectChainId);
  const isEIP1559Network = useSelector(selectIsEIP1559Network);
  const approvalTransaction: TxParams = useSelector(selectSwapsApprovalTransaction);

  const submitSwapsSmartTransactions = async () => {
    // Approval tx (if one exists)
    let approvalTxUuid: string | undefined;
    if (approvalTransaction) {
      approvalTxUuid = await submitSmartTransaction({
        unsignedTransaction: {...approvalTransaction, chainId},
        smartTransactionFees: {
          fees: [],
          cancelFees: [],
        },
        chainId,
        isEIP1559Network,
        gasEstimates,
      });
    }

    // Trade tx
    const tradeTxUuid = await submitSmartTransaction({
      unsignedTransaction: {...tradeTransaction, chainId},
      smartTransactionFees: {
        fees: [],
        cancelFees: [],
      },
      chainId,
      isEIP1559Network,
      gasEstimates,
    });
  };


  return { submitSwapsSmartTransactions };
};
