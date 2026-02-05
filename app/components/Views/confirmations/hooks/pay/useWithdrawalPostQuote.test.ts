import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { useWithdrawalPostQuote } from './useWithdrawalPostQuote';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Engine from '../../../../../core/Engine';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));

const TRANSACTION_ID_MOCK = 'transaction-123';

describe('useWithdrawalPostQuote', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const setTransactionConfigMock = jest.mocked(
    Engine.context.TransactionPayController.setTransactionConfig,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing for non-withdrawal transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.simpleSend,
    } as never);

    renderHook(() => useWithdrawalPostQuote());

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('sets isPostQuote=true for withdrawal transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.predictWithdraw,
    } as never);

    renderHook(() => useWithdrawalPostQuote());

    expect(setTransactionConfigMock).toHaveBeenCalledWith(
      TRANSACTION_ID_MOCK,
      expect.any(Function),
    );

    // Verify the callback sets isPostQuote to true
    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config = { isPostQuote: false };
    callback(config);
    expect(config.isPostQuote).toBe(true);
  });

  it('only initializes once even on re-renders', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.predictWithdraw,
    } as never);

    const { rerender } = renderHook(() => useWithdrawalPostQuote());

    expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);

    rerender();

    expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when transactionId is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: undefined,
      type: TransactionType.predictWithdraw,
    } as never);

    renderHook(() => useWithdrawalPostQuote());

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });
});
