import { BN } from 'ethereumjs-util';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { remove0x, add0x } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { toWei } from '../../../../../util/number';

export const updateTransactionToMaxValue = async ({
  transactionId,
  isEIP1559Transaction,
  EIP1559GasTransaction,
  legacyGasTransaction,
  accountBalance,
  setTransactionValue,
}: {
  transactionId: string;
  isEIP1559Transaction: boolean;
  EIP1559GasTransaction: {
    gasFeeMaxNative: string;
  };
  legacyGasTransaction: {
    gasFeeMaxNative: string;
  };
  accountBalance: string;
  setTransactionValue: (value: string) => void;
}) => {
  const { TransactionController } = Engine.context;
  const { gasFeeMaxNative } = isEIP1559Transaction
    ? EIP1559GasTransaction
    : legacyGasTransaction;

  const accountBalanceBN = new BN(remove0x(accountBalance), 16);
  const transactionFeeMax = new BN(toWei(gasFeeMaxNative, 'ether'), 16);

  const maxTransactionValueBN = accountBalanceBN.sub(transactionFeeMax);

  const maxTransactionValueHex = add0x(maxTransactionValueBN.toString(16));

  const txMeta = (await TransactionController.updateEditableParams(
    transactionId,
    {
      value: maxTransactionValueHex,
    },
  )) as TransactionMeta;

  setTransactionValue(txMeta.txParams.value as string);
};
