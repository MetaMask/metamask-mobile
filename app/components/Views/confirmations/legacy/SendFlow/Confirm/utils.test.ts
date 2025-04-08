import { updateTransactionToMaxValue } from './utils';
import { BN } from 'ethereumjs-util';
import { hexToBN } from '@metamask/controller-utils';

// Mock the Engine and its context
jest.mock('../../../../../../util/transaction-controller', () => ({
  updateEditableParams: jest.fn().mockResolvedValue({
    txParams: { value: '0x0' },
  }),
}));

describe('updateTransactionToMaxValue', () => {
  it('should update the transaction value correctly', async () => {
    const transactionId = 'testTransactionId';
    const isEIP1559Transaction = true;
    const EIP1559GasTransaction = { gasFeeMaxHex: '0x01' };
    const legacyGasTransaction = { gasFeeMaxHex: '0x02' };
    const accountBalance = '0x2386f26fc10000'; // 0.1 ether in wei
    const setTransactionValue = jest.fn();

    await updateTransactionToMaxValue({
      transactionId,
      isEIP1559Transaction,
      EIP1559GasTransaction,
      legacyGasTransaction,
      accountBalance,
      setTransactionValue,
    });

    // Calculate expected max transaction value
    const accountBalanceBN = new BN('2386f26fc10000', 16); // 0.1 ether in wei
    const transactionFeeMax = hexToBN(EIP1559GasTransaction.gasFeeMaxHex);
    const expectedMaxTransactionValueBN =
      accountBalanceBN.sub(transactionFeeMax);
    const expectedMaxTransactionValueHex =
      '0x' + expectedMaxTransactionValueBN.toString(16);

    // Check if setTransactionValue was called with the correct value
    expect(setTransactionValue).toHaveBeenCalledWith(
      expectedMaxTransactionValueHex,
    );
  });
});
