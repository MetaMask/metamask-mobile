import { BN } from 'ethereumjs-util';
import convert from '@metamask/ethjs-unit';
import { remove0x, add0x } from '@metamask/utils';
import Engine from '../../../../../core/Engine';

export const updateTransactionToMaxValue = async ({
  transactionId,
  isEIP1559Transaction,
  EIP1559GasTransaction,
  legacyGasTransaction,
  accountBalance,
  setTransactionValue,
}) => {
  const { TransactionController } = Engine.context;
  const { gasFeeMaxNative } = isEIP1559Transaction
    ? EIP1559GasTransaction
    : legacyGasTransaction;

  const accountBalanceBN = new BN(remove0x(accountBalance), 16);
  const transactionFeeMax = new BN(convert.toWei(gasFeeMaxNative, 'ether'), 16);

  const maxTransactionValueBN = accountBalanceBN.sub(transactionFeeMax);

  const maxTransactionValueHex = add0x(maxTransactionValueBN.toString(16));

  const transactionMeta = await TransactionController.updateEditableParams(
    transactionId,
    {
      value: maxTransactionValueHex,
    },
  );

  setTransactionValue(transactionMeta.txParams.value);
};
