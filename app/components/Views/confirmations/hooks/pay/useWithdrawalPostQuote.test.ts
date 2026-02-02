import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { useWithdrawalPostQuote } from './useWithdrawalPostQuote';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Engine from '../../../../../core/Engine';
import { POLYGON_USDCE } from '../../constants/predict';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
      updatePaymentToken: jest.fn(),
    },
  },
}));

const TRANSACTION_ID_MOCK = 'transaction-123';
const NETWORK_CLIENT_ID_MOCK = 'network-client-mock';

describe('useWithdrawalPostQuote', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const findNetworkClientIdByChainIdMock = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );
  const setTransactionConfigMock = jest.mocked(
    Engine.context.TransactionPayController.setTransactionConfig,
  );
  const updatePaymentTokenMock = jest.mocked(
    Engine.context.TransactionPayController.updatePaymentToken,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findNetworkClientIdByChainIdMock.mockReturnValue(NETWORK_CLIENT_ID_MOCK);
  });

  it('does nothing for non-withdrawal transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.simpleSend,
    } as never);

    renderHook(() => useWithdrawalPostQuote());

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
    expect(updatePaymentTokenMock).not.toHaveBeenCalled();
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

  it('initializes paymentToken with default withdrawal token', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.predictWithdraw,
    } as never);

    renderHook(() => useWithdrawalPostQuote());

    expect(updatePaymentTokenMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID_MOCK,
      tokenAddress: POLYGON_USDCE.address,
      chainId: expect.any(String),
    });
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

  it('does not update paymentToken if network client not found', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.predictWithdraw,
    } as never);
    findNetworkClientIdByChainIdMock.mockReturnValue(undefined as never);

    renderHook(() => useWithdrawalPostQuote());

    expect(setTransactionConfigMock).toHaveBeenCalled();
    expect(updatePaymentTokenMock).not.toHaveBeenCalled();
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
