import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayPostQuote } from './useTransactionPayPostQuote';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import Engine from '../../../../../core/Engine';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../utils/transaction');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));

const TRANSACTION_ID_MOCK = 'transaction-123';

describe('useTransactionPayPostQuote', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const isTransactionPayWithdrawMock = jest.mocked(isTransactionPayWithdraw);
  const setTransactionConfigMock = jest.mocked(
    Engine.context.TransactionPayController.setTransactionConfig,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    isTransactionPayWithdrawMock.mockReturnValue(false);
  });

  it('does nothing for non-post-quote transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.simpleSend,
    } as never);
    isTransactionPayWithdrawMock.mockReturnValue(false);

    renderHook(() => useTransactionPayPostQuote());

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('does nothing when transactionId is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: undefined,
      type: TransactionType.predictWithdraw,
    } as never);
    isTransactionPayWithdrawMock.mockReturnValue(true);

    renderHook(() => useTransactionPayPostQuote());

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });
});
