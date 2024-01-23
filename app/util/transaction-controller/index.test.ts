import { WalletDevice } from '@metamask/transaction-controller';
import { addTransaction, estimateGas } from './index';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      addTransaction: jest.fn(),
      estimateGas: jest.fn(),
    },
  },
}));

describe('Transaction Controller Util', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call addTransaction with correct parameters', async () => {
    const mockTransaction = { from: '0x0', to: '0x1', value: '0x0' };
    const mockOpts = {
      deviceConfirmedOn: WalletDevice.MM_MOBILE,
      origin: 'origin',
    };

    await addTransaction(mockTransaction, mockOpts);

    expect(
      Engine.context.TransactionController.addTransaction,
    ).toHaveBeenCalledWith(mockTransaction, mockOpts);
  });

  it('should call estimateGas with correct parameters', async () => {
    const mockTransaction = { from: '0x0', to: '0x1', value: '0x0' };

    await estimateGas(mockTransaction);

    expect(
      Engine.context.TransactionController.estimateGas,
    ).toHaveBeenCalledWith(mockTransaction);
  });
});
