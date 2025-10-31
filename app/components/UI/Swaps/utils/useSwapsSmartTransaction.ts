import {
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { decimalToHex } from '../../../../util/conversions';
import { selectSwapsApprovalTransaction } from '../../../../reducers/swaps';
import { Quote, TxParams } from '@metamask/swaps-controller/dist/types';
import {
  selectEvmChainId,
  selectIsEIP1559Network,
} from '../../../../selectors/networkController';
import { getGasFeeEstimatesForTransaction } from './gas';
import { Hex } from '@metamask/utils';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import Logger from '../../../../util/Logger';
import { Fee } from '@metamask/smart-transactions-controller';
import {
  getGasIncludedTransactionFees,
  type GasIncludedQuote,
} from '../../../../util/smart-transactions';

interface TemporarySmartTransactionGasFees {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

const createSignedTransactions = async (
  unsignedTransaction: Partial<TransactionParams> & {
    from: string;
    chainId: string;
  },
  fees: TemporarySmartTransactionGasFees[],
): Promise<string[]> => {
  const { TransactionController } = Engine.context;

  const unsignedTransactionsWithFees = fees.map((fee) => {
    const unsignedTransactionWithFees = {
      ...unsignedTransaction,
      maxFeePerGas: decimalToHex(fee.maxFeePerGas).toString(),
      maxPriorityFeePerGas: decimalToHex(fee.maxPriorityFeePerGas).toString(),
      gas: unsignedTransaction.gas,
      value: unsignedTransaction.value,
    };
    return unsignedTransactionWithFees;
  });
  const signedTransactions =
    (await TransactionController.approveTransactionsWithSameNonce(
      unsignedTransactionsWithFees,
    )) as string[]; // fees is an array, so we will get an array back
  return signedTransactions;
};

const submitSmartTransaction = async ({
  unsignedTransaction,
  smartTransactionFees,
  chainId,
  isEIP1559Network,
  gasEstimates,
}: {
  unsignedTransaction: Partial<TransactionParams> & {
    from: string;
    chainId: string;
  };
  smartTransactionFees: {
    fees?: Fee[];
    cancelFees?: Fee[];
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
    { ...unsignedTransaction, chainId },
    gasEstimates,
    { chainId, isEIP1559Network },
  );

  const unsignedTransactionWithGasFeeEstimates = {
    ...unsignedTransaction,
    ...gasFeeEstimates,
  };

  const signedTransactions = await createSignedTransactions(
    unsignedTransactionWithGasFeeEstimates,
    smartTransactionFees.fees?.map((fee) => ({
      maxFeePerGas: fee.maxFeePerGas.toString(),
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas.toString(),
    })) || [],
  );

  try {
    const response = await SmartTransactionsController.submitSignedTransactions(
      {
        signedTransactions,
        txParams: unsignedTransactionWithGasFeeEstimates,
        // The "signedCanceledTransactions" parameter is still expected by the STX controller but is no longer used.
        // So we are passing an empty array. The parameter may be deprecated in a future update.
        signedCanceledTransactions: [],
      },
    );
    // Returns e.g.: { uuid: 'dP23W7c2kt4FK9TmXOkz1UM2F20' }
    return response.uuid;
  } catch (error) {
    Logger.error(error as Error);
    throw error;
  }
};

export const useSwapsSmartTransaction = ({
  quote,
  gasEstimates,
}: {
  quote?: Quote & Partial<GasIncludedQuote>;
  gasEstimates: {
    gasPrice: string;
    medium: string;
  };
}) => {
  const chainId = useSelector(selectEvmChainId);
  const isEIP1559Network = useSelector(selectIsEIP1559Network);
  const approvalTransaction: TxParams | null = useSelector(
    selectSwapsApprovalTransaction,
  );
  const tradeTransaction = quote?.trade;

  // We don't need to await on the approval tx to be confirmed on chain. We can simply submit both the approval and trade tx at the same time.
  // Sentinel will batch them for us and ensure they are executed in the correct order.
  const submitSwapsSmartTransaction = async () => {
    const { SmartTransactionsController } = Engine.context;

    // Calc fees
    let smartTransactionFees;
    if (quote?.isGasIncludedTrade) {
      smartTransactionFees = getGasIncludedTransactionFees(
        quote as unknown as GasIncludedQuote,
      );
    }
    if (!smartTransactionFees) {
      smartTransactionFees = await SmartTransactionsController.getFees(
        tradeTransaction,
        approvalTransaction,
      );
    }

    // Approval transaction (if it exists)
    let approvalTxUuid: string | undefined;
    let tradeTxUuid: string | undefined;
    if (approvalTransaction && smartTransactionFees.approvalTxFees) {
      const approvalGas =
        decimalToHex(smartTransactionFees.approvalTxFees.gasLimit).toString() ||
        '0';

      approvalTxUuid = await submitSmartTransaction({
        unsignedTransaction: {
          ...approvalTransaction,
          chainId,
          value: '0x0',
          gas: approvalGas,
        },
        smartTransactionFees: {
          fees: smartTransactionFees.approvalTxFees.fees,
          cancelFees: [],
        },
        chainId,
        isEIP1559Network,
        gasEstimates,
      });

      if (approvalTxUuid) {
        SmartTransactionsController.updateSmartTransaction({
          uuid: approvalTxUuid,
          origin: ORIGIN_METAMASK,
          type: TransactionType.swapApproval,
          creationTime: Date.now(),
        });
      }
    }

    // Trade transaction
    if (tradeTransaction) {
      const tradeGas = decimalToHex(
        smartTransactionFees.tradeTxFees?.gasLimit || 0,
      ).toString();
      tradeTxUuid = await submitSmartTransaction({
        unsignedTransaction: { ...tradeTransaction, chainId, gas: tradeGas },
        smartTransactionFees: {
          fees: smartTransactionFees.tradeTxFees?.fees,
          cancelFees: [],
        },
        chainId,
        isEIP1559Network,
        gasEstimates,
      });

      if (tradeTxUuid) {
        SmartTransactionsController.updateSmartTransaction({
          uuid: tradeTxUuid,
          origin: ORIGIN_METAMASK,
          type: TransactionType.swap,
          creationTime: Date.now(),
        });
      }
    }

    return { approvalTxUuid, tradeTxUuid };
  };

  return { submitSwapsSmartTransaction };
};
