import { remove0x, add0x } from '@metamask/utils';
import { hexToBN } from '@metamask/controller-utils';
import { updateEditableParams } from '../../../../../../util/transaction-controller';

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
    gasFeeMaxHex: string;
  };
  legacyGasTransaction: {
    gasFeeMaxHex: string;
  };
  accountBalance: string;
  setTransactionValue: (value: string) => void;
}) => {
  const { gasFeeMaxHex } = isEIP1559Transaction
    ? EIP1559GasTransaction
    : legacyGasTransaction;

  const accountBalanceBN = hexToBN(remove0x(accountBalance));
  const transactionFeeMax = hexToBN(gasFeeMaxHex);

  const maxTransactionValueBN = accountBalanceBN.sub(transactionFeeMax);

  if (maxTransactionValueBN.lt(hexToBN('0x0'))) {
    return;
  }

  const maxTransactionValueHex = add0x(maxTransactionValueBN.toString(16));

  if (transactionId) {
    await updateEditableParams(transactionId, {
      value: maxTransactionValueHex,
    });
  }

  setTransactionValue(maxTransactionValueHex);
};
