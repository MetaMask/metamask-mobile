import { updateTransactionToMaxValue } from './utils';
import { updateEditableParams } from '../../../../../../util/transaction-controller';
import { hexToBN } from '@metamask/controller-utils';

jest.mock('../../../../../../util/transaction-controller', () => ({
  updateEditableParams: jest.fn().mockResolvedValue({
    txParams: { value: '0x0' },
  }),
}));

describe('updateTransactionToMaxValue', () => {
  let mockSetTransactionValue: jest.Mock;

  beforeEach(() => {
    mockSetTransactionValue = jest.fn();
    (updateEditableParams as jest.Mock).mockClear();
  });

  it('updates EIP1559 transaction value', async () => {
    const transactionId = 'testTransactionId';
    const accountBalance = '0x2386f26fc10000'; // 0.1 ether in wei
    const gasFeeMaxHex = '0x2386f26fc1'; // Small gas fee

    await updateTransactionToMaxValue({
      transactionId,
      isEIP1559Transaction: true,
      EIP1559GasTransaction: { gasFeeMaxHex },
      legacyGasTransaction: { gasFeeMaxHex: '0x0' },
      accountBalance,
      setTransactionValue: mockSetTransactionValue,
    });

    const expectedValue = hexToBN(accountBalance)
      .sub(hexToBN(gasFeeMaxHex))
      .toString(16);
    const expectedHexValue = `0x${expectedValue}`;

    expect(mockSetTransactionValue).toHaveBeenCalledWith(expectedHexValue);
    expect(updateEditableParams).toHaveBeenCalledWith(transactionId, {
      value: expectedHexValue,
    });
  });

  it('updates legacy transaction value', async () => {
    const transactionId = 'testTransactionId';
    const accountBalance = '0x2386f26fc10000'; // 0.1 ether in wei
    const gasFeeMaxHex = '0x2386f26fc1'; // Small gas fee

    await updateTransactionToMaxValue({
      transactionId,
      isEIP1559Transaction: false,
      EIP1559GasTransaction: { gasFeeMaxHex: '0x0' },
      legacyGasTransaction: { gasFeeMaxHex },
      accountBalance,
      setTransactionValue: mockSetTransactionValue,
    });

    const expectedValue = hexToBN(accountBalance)
      .sub(hexToBN(gasFeeMaxHex))
      .toString(16);
    const expectedHexValue = `0x${expectedValue}`;

    expect(mockSetTransactionValue).toHaveBeenCalledWith(expectedHexValue);
    expect(updateEditableParams).toHaveBeenCalledWith(transactionId, {
      value: expectedHexValue,
    });
  });

  it('does not update value if it makes account have negative balance', async () => {
    const transactionId = 'testTransactionId';
    const accountBalance = '0x2386f26fc1'; // Very small balance
    const gasFeeMaxHex = '0x2386f26fc10000'; // Large gas fee

    await updateTransactionToMaxValue({
      transactionId,
      isEIP1559Transaction: true,
      EIP1559GasTransaction: { gasFeeMaxHex },
      legacyGasTransaction: { gasFeeMaxHex: '0x0' },
      accountBalance,
      setTransactionValue: mockSetTransactionValue,
    });

    expect(mockSetTransactionValue).not.toHaveBeenCalled();
    expect(updateEditableParams).not.toHaveBeenCalled();
  });

  it('does not update value when missing transactionId', async () => {
    const accountBalance = '0x2386f26fc10000';
    const gasFeeMaxHex = '0x2386f26fc1';

    await updateTransactionToMaxValue({
      transactionId: '',
      isEIP1559Transaction: true,
      EIP1559GasTransaction: { gasFeeMaxHex },
      legacyGasTransaction: { gasFeeMaxHex: '0x0' },
      accountBalance,
      setTransactionValue: mockSetTransactionValue,
    });

    const expectedValue = hexToBN(accountBalance)
      .sub(hexToBN(gasFeeMaxHex))
      .toString(16);
    const expectedHexValue = `0x${expectedValue}`;

    expect(mockSetTransactionValue).toHaveBeenCalledWith(expectedHexValue);
    expect(updateEditableParams).not.toHaveBeenCalled();
  });
});
