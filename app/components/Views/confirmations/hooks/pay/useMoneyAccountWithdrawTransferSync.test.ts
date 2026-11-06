import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { getMoneyAccountWithdrawTransferUpdate } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMoneyAccountWithdrawTransferSync } from './useMoneyAccountWithdrawTransferSync';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionController: { state: { transactions: [] } },
  },
}));
jest.mock('../../../../../util/Logger', () => ({ error: jest.fn() }));
jest.mock('../../../../../util/transaction-controller', () => ({
  updateAtomicBatchData: jest.fn(),
}));
jest.mock('../../../../UI/Money/utils/moneyAccountTransactions', () => ({
  getMoneyAccountWithdrawTransferUpdate: jest.fn(),
}));
jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('../transactions/useTransactionMetadataRequest');

const TRANSACTION_ID = 'tx-1';
const RECIPIENT = '0x1111111111111111111111111111111111111111' as Hex;
const TRANSFER_DATA = '0xa9059cbb' as Hex;
const PAYMENT_TOKEN: TransactionPaymentToken = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  balanceFiat: '0',
  balanceHuman: '0',
  balanceRaw: '0',
  balanceUsd: '0',
  decimals: 6,
  symbol: 'USDC',
};

const STORE_TRANSACTION = {
  id: TRANSACTION_ID,
  txParams: { from: '0x2222222222222222222222222222222222222222' },
} as TransactionMeta;

const CONTROLLER_TRANSACTION = {
  ...STORE_TRANSACTION,
  nestedTransactions: [{ data: '0x1' }, { data: '0x2' }],
} as TransactionMeta;

describe('useMoneyAccountWithdrawTransferSync', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionAccountOverrideMock = jest.mocked(
    useTransactionAccountOverride,
  );
  const getTransferUpdateMock = jest.mocked(
    getMoneyAccountWithdrawTransferUpdate,
  );
  const updateAtomicBatchDataMock = jest.mocked(updateAtomicBatchData);

  beforeEach(() => {
    jest.resetAllMocks();
    useSelectorMock.mockReturnValue(PAYMENT_TOKEN);
    useTransactionMetadataRequestMock.mockReturnValue(STORE_TRANSACTION);
    useTransactionAccountOverrideMock.mockReturnValue(RECIPIENT);
    updateAtomicBatchDataMock.mockResolvedValue('0x');
    Engine.context.TransactionController.state.transactions = [
      CONTROLLER_TRANSACTION,
    ];
  });

  it('re-encodes the transfer from the controller copy of the batch', () => {
    getTransferUpdateMock.mockReturnValue({
      nestedTransactionIndex: 1,
      transactionData: TRANSFER_DATA,
    });

    renderHook(() => useMoneyAccountWithdrawTransferSync());

    expect(getTransferUpdateMock).toHaveBeenCalledWith(
      CONTROLLER_TRANSACTION,
      RECIPIENT,
      expect.objectContaining({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
      }),
    );
    expect(updateAtomicBatchDataMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID,
      transactionIndex: 1,
      transactionData: TRANSFER_DATA,
    });
  });

  it('does nothing when the transfer already pays the target', () => {
    getTransferUpdateMock.mockReturnValue(undefined);

    renderHook(() => useMoneyAccountWithdrawTransferSync());

    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
  });

  it('does nothing until a recipient is set', () => {
    useTransactionAccountOverrideMock.mockReturnValue(undefined);

    renderHook(() => useMoneyAccountWithdrawTransferSync());

    expect(getTransferUpdateMock).not.toHaveBeenCalled();
    expect(updateAtomicBatchDataMock).not.toHaveBeenCalled();
  });

  it('logs a failed re-encode', async () => {
    const error = new Error('update failed');
    getTransferUpdateMock.mockReturnValue({
      nestedTransactionIndex: 1,
      transactionData: TRANSFER_DATA,
    });
    updateAtomicBatchDataMock.mockRejectedValue(error);

    renderHook(() => useMoneyAccountWithdrawTransferSync());
    await Promise.resolve();

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Failed to sync Money Account withdraw transfer',
    );
  });
});
