import { BN } from 'ethereumjs-util';
import { remove0x, add0x } from '@metamask/utils';
import { toWei } from '../../../../../util/number';
import { updateEditableParams } from '../../../../../util/transaction-controller';

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
  const { gasFeeMaxNative } = isEIP1559Transaction
    ? EIP1559GasTransaction
    : legacyGasTransaction;

  const accountBalanceBN = new BN(remove0x(accountBalance), 16);
  const transactionFeeMax = new BN(toWei(gasFeeMaxNative, 'ether'), 16);

  const maxTransactionValueBN = accountBalanceBN.sub(transactionFeeMax);

  const maxTransactionValueHex = add0x(maxTransactionValueBN.toString(16));

  if (transactionId) {
    await updateEditableParams(transactionId, {
      value: maxTransactionValueHex,
    });
  }

  setTransactionValue(maxTransactionValueHex);
};
