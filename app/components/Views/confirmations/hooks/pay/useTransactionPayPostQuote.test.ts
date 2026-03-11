import { renderHook } from '@testing-library/react-hooks';
import type { Hex } from '@metamask/utils';
import { useTransactionPayPostQuote } from './useTransactionPayPostQuote';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayWithdraw } from './useTransactionPayWithdraw';
import Engine from '../../../../../core/Engine';
import { computeProxyAddress } from '../../../../UI/Predict/providers/polymarket/safe/utils';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayWithdraw');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));
jest.mock('../../../../UI/Predict/providers/polymarket/safe/utils', () => ({
  computeProxyAddress: jest.fn(),
}));

const TRANSACTION_ID_MOCK = 'transaction-123';
const FROM_MOCK = '0x1234567890123456789012345678901234567890' as Hex;
const PROXY_ADDRESS_MOCK = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;

describe('useTransactionPayPostQuote', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);
  const setTransactionConfigMock = jest.mocked(
    Engine.context.TransactionPayController.setTransactionConfig,
  );
  const computeProxyAddressMock = jest.mocked(computeProxyAddress);

  beforeEach(() => {
    jest.clearAllMocks();
    computeProxyAddressMock.mockReturnValue(PROXY_ADDRESS_MOCK);
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
      txParams: { from: FROM_MOCK },
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

  it('sets isPostQuote=true and refundTo=proxyAddress in config callback', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      txParams: { from: FROM_MOCK },
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    renderHook(() => useTransactionPayPostQuote());

    expect(computeProxyAddressMock).toHaveBeenCalledWith(FROM_MOCK);

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as { isPostQuote?: boolean; refundTo?: Hex };
    callback(config);

    expect(config.isPostQuote).toBe(true);
    expect(config.refundTo).toBe(PROXY_ADDRESS_MOCK);
  });

  it('sets refundTo=undefined when txParams.from is missing', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      txParams: {},
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    renderHook(() => useTransactionPayPostQuote());

    expect(computeProxyAddressMock).not.toHaveBeenCalled();

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as { isPostQuote?: boolean; refundTo?: Hex };
    callback(config);

    expect(config.isPostQuote).toBe(true);
    expect(config.refundTo).toBeUndefined();
  });

  it('does not call setTransactionConfig twice for the same transactionId', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      txParams: { from: FROM_MOCK },
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
      txParams: { from: FROM_MOCK },
    } as never);

    const { rerender } = renderHook(() => useTransactionPayPostQuote());
    expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'transaction-456',
      txParams: { from: FROM_MOCK },
    } as never);
    rerender();

    expect(setTransactionConfigMock).toHaveBeenCalledTimes(2);
  });
});
