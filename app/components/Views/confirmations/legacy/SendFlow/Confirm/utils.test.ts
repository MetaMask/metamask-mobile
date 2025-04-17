import { updateTransactionToMaxValue } from './utils';
import { BN } from 'ethereumjs-util';
import { toWei } from '../../../../../../util/number';

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
    const EIP1559GasTransaction = { gasFeeMaxNative: '0.01' };
    const legacyGasTransaction = { gasFeeMaxNative: '0.02' };
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
    const transactionFeeMax = toWei('0.01', 'ether');
    const expectedMaxTransactionValueBN = accountBalanceBN.sub(
      new BN(transactionFeeMax.toString()),
    );
    const expectedMaxTransactionValueHex = `0x${expectedMaxTransactionValueBN.toString(
      16,
    )}`;

    // Check if setTransactionValue was called with the correct value
    expect(setTransactionValue).toHaveBeenCalledWith(
      expectedMaxTransactionValueHex,
    );
  });
});
