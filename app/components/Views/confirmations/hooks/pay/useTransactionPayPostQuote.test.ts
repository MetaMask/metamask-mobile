import { renderHook } from '@testing-library/react-hooks';
import { useTransactionPayPostQuote } from './useTransactionPayPostQuote';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayWithdraw } from './useTransactionPayWithdraw';
import Engine from '../../../../../core/Engine';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayWithdraw');
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
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);
  const setTransactionConfigMock = jest.mocked(
    Engine.context.TransactionPayController.setTransactionConfig,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: false,
      canSelectWithdrawToken: false,
    });
  });

  it('does nothing when canSelectWithdrawToken is false', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
    } as never);

    renderHook(() => useTransactionPayPostQuote());

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('does nothing when transactionId is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: undefined,
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    renderHook(() => useTransactionPayPostQuote());

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('sets isPostQuote when canSelectWithdrawToken is true and transactionId exists', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    renderHook(() => useTransactionPayPostQuote());

    expect(setTransactionConfigMock).toHaveBeenCalledWith(
      TRANSACTION_ID_MOCK,
      expect.any(Function),
    );
  });

  it('does not call setTransactionConfig twice for the same transactionId', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    const { rerender } = renderHook(() => useTransactionPayPostQuote());
    rerender();

    expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);
  });

  it('handles setTransactionConfig error gracefully', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    setTransactionConfigMock.mockImplementation(() => {
      throw new Error('Controller error');
    });

    // Should not throw
    expect(() => renderHook(() => useTransactionPayPostQuote())).not.toThrow();
  });

  it('calls setTransactionConfig again when transactionId changes', () => {
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
    } as never);

    const { rerender } = renderHook(() => useTransactionPayPostQuote());
    expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'transaction-456',
    } as never);
    rerender();

    expect(setTransactionConfigMock).toHaveBeenCalledTimes(2);
  });
});
