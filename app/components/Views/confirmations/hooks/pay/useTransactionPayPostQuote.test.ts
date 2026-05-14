import { renderHook } from '@testing-library/react-hooks';
import type { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
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
    PredictController: {
      getAccountState: jest.fn(),
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
  const getAccountStateMock = jest.mocked(
    Engine.context.PredictController.getAccountState,
  );
  const computeProxyAddressMock = jest.mocked(computeProxyAddress);

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    jest.clearAllMocks();
    computeProxyAddressMock.mockReturnValue(PROXY_ADDRESS_MOCK);
    getAccountStateMock.mockResolvedValue({
      address: '0xProxyAddress',
      isDeployed: true,
      walletType: 'safe',
      balance: 100,
    } as never);
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

  it('sets isHyperliquidSource=true and no refundTo for perpsWithdraw', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      txParams: { from: FROM_MOCK },
      type: TransactionType.perpsWithdraw,
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    renderHook(() => useTransactionPayPostQuote());

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as {
      isPostQuote?: boolean;
      refundTo?: Hex;
      isHyperliquidSource?: boolean;
    };
    callback(config);

    expect(config.isPostQuote).toBe(true);
    expect(config.isHyperliquidSource).toBe(true);
    expect(config.refundTo).toBeUndefined();
    expect(computeProxyAddressMock).not.toHaveBeenCalled();
  });

  it('does not set isHyperliquidSource for non-perps withdrawals', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      txParams: { from: FROM_MOCK },
      type: TransactionType.predictWithdraw,
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    renderHook(() => useTransactionPayPostQuote());

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as {
      isPostQuote?: boolean;
      refundTo?: Hex;
      isHyperliquidSource?: boolean;
    };
    callback(config);

    expect(config.isPostQuote).toBe(true);
    expect(config.refundTo).toBe(PROXY_ADDRESS_MOCK);
    expect(config.isHyperliquidSource).toBeUndefined();
  });

  it('skips refundTo and isHyperliquidSource for moneyAccountWithdraw', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      txParams: { from: FROM_MOCK },
      type: TransactionType.moneyAccountWithdraw,
    } as never);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });

    renderHook(() => useTransactionPayPostQuote());

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config = {} as {
      isPostQuote?: boolean;
      refundTo?: Hex;
      isHyperliquidSource?: boolean;
    };
    callback(config);

    expect(config.isPostQuote).toBe(true);
    expect(config.refundTo).toBeUndefined();
    expect(config.isHyperliquidSource).toBeUndefined();
    expect(computeProxyAddressMock).not.toHaveBeenCalled();
  });

  describe('Polymarket deposit-wallet predictWithdraw', () => {
    beforeEach(() => {
      setTransactionConfigMock.mockReset();
      useTransactionMetadataRequestMock.mockReturnValue({
        id: TRANSACTION_ID_MOCK,
        txParams: { from: FROM_MOCK },
        type: TransactionType.predictWithdraw,
      } as never);
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
    });

    it('flags transaction and clears refundTo when walletType is deposit-wallet', async () => {
      getAccountStateMock.mockResolvedValue({
        address: '0xDepositWallet',
        isDeployed: true,
        walletType: 'deposit-wallet',
        balance: 50,
      } as never);

      renderHook(() => useTransactionPayPostQuote());
      await flushPromises();

      expect(setTransactionConfigMock).toHaveBeenCalledTimes(2);

      const followUpCallback = setTransactionConfigMock.mock.calls[1][1];
      const config = {
        refundTo: PROXY_ADDRESS_MOCK,
      } as {
        isPolymarketDepositWallet?: boolean;
        refundTo?: Hex;
      };
      followUpCallback(config);

      expect(config.isPolymarketDepositWallet).toBe(true);
      expect(config.refundTo).toBeUndefined();
    });

    it('does not set deposit-wallet flag when walletType is safe', async () => {
      getAccountStateMock.mockResolvedValue({
        address: '0xSafeProxy',
        isDeployed: true,
        walletType: 'safe',
        balance: 100,
      } as never);

      renderHook(() => useTransactionPayPostQuote());
      await flushPromises();

      expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);
    });

    it('does not resolve account state for non-predictWithdraw flows', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: TRANSACTION_ID_MOCK,
        txParams: { from: FROM_MOCK },
        type: TransactionType.perpsWithdraw,
      } as never);

      renderHook(() => useTransactionPayPostQuote());
      await flushPromises();

      expect(getAccountStateMock).not.toHaveBeenCalled();
      expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);
    });

    it('swallows getAccountState errors without setting the deposit-wallet flag', async () => {
      getAccountStateMock.mockRejectedValue(new Error('boom'));

      renderHook(() => useTransactionPayPostQuote());
      await flushPromises();

      expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);
    });
  });
});
