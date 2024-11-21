import { WalletDevice } from '@metamask/transaction-controller';
//eslint-disable-next-line import/no-namespace
import * as TransactionControllerUtils from './index';
import Engine from '../../core/Engine';

const { addTransaction, estimateGas, getNetworkNonce, ...proxyMethods } =
  TransactionControllerUtils;

const TRANSACTION_MOCK = { from: '0x0', to: '0x1', value: '0x0' };
const TRANSACTION_OPTIONS_MOCK = {
  deviceConfirmedOn: WalletDevice.MM_MOBILE,
  origin: 'origin',
};

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      addTransaction: jest.fn(),
      estimateGas: jest.fn(),

      // Proxy methods
      handleMethodData: jest.fn(),
      getNonceLock: jest.fn(),
      speedUpTransaction: jest.fn(),
      startIncomingTransactionPolling: jest.fn(),
      stopIncomingTransactionPolling: jest.fn(),
      updateIncomingTransactions: jest.fn(),
      updateSecurityAlertResponse: jest.fn(),
      updateTransaction: jest.fn(),
      wipeTransactions: jest.fn(),
    },
  },
}));

describe('Transaction Controller Util', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addTransaction', () => {
    it('should call addTransaction with correct parameters', async () => {
      await addTransaction(TRANSACTION_MOCK, TRANSACTION_OPTIONS_MOCK);

      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(TRANSACTION_MOCK, TRANSACTION_OPTIONS_MOCK);
    });
  });

  describe('estimateGas', () => {
    it('should call estimateGas with correct parameters', async () => {
      await estimateGas(TRANSACTION_MOCK);

      expect(
        Engine.context.TransactionController.estimateGas,
      ).toHaveBeenCalledWith(TRANSACTION_MOCK);
    });
  });

  describe('proxy methods', () => {
    it('should call Transaction controller API methods', () => {
      const proxyMethodsKeys = Object.keys(proxyMethods);
      proxyMethodsKeys.forEach((key) => {
        const proxyMethod = proxyMethods[key as keyof typeof proxyMethods];
        proxyMethod();
        expect(
          Engine.context.TransactionController[
            key as keyof typeof proxyMethods
          ],
        ).toHaveBeenCalled();
      });
    });
  });

  describe('getNetworkNonce', () => {
    const nonceMock = 123;
    const fromMock = '0x123';

    beforeEach(() => {
      jest.spyOn(Engine.context.TransactionController, 'getNonceLock');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns value from TransactionController', async () => {
      (
        Engine.context.TransactionController.getNonceLock as jest.Mock
      ).mockResolvedValueOnce({
        nextNonce: nonceMock,
        releaseLock: jest.fn(),
      });

      expect(
        await TransactionControllerUtils.getNetworkNonce({ from: fromMock }),
      ).toBe(nonceMock);

      expect(
        Engine.context.TransactionController.getNonceLock,
      ).toHaveBeenCalledWith(fromMock);
    });

    it('releases nonce lock', async () => {
      const releaseLockMock = jest.fn();

      (
        Engine.context.TransactionController.getNonceLock as jest.Mock
      ).mockResolvedValueOnce({
        nextNonce: nonceMock,
        releaseLock: releaseLockMock,
      });

      await TransactionControllerUtils.getNetworkNonce({ from: fromMock });

      expect(releaseLockMock).toHaveBeenCalledTimes(1);
    });
  });
});
