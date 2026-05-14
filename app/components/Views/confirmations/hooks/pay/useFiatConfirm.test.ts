import { renderHook, act } from '@testing-library/react-hooks';

import { useFiatConfirm } from './useFiatConfirm';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useHeadlessBuy } from '../../../../UI/Ramp/headless';
import { useConfirmationContext } from '../../context/confirmation-context';
import Engine from '../../../../../core/Engine';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayData');
jest.mock('../../../../UI/Ramp/headless');
jest.mock('../../context/confirmation-context');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      updateFiatPayment: jest.fn(),
    },
  },
}));

const TRANSACTION_ID_MOCK = 'tx-123';

describe('useFiatConfirm', () => {
  const startHeadlessBuyMock = jest.fn();
  const setIsHeadlessBuyInProgressMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    jest.mocked(useHeadlessBuy).mockReturnValue({
      startHeadlessBuy: startHeadlessBuyMock,
    } as unknown as ReturnType<typeof useHeadlessBuy>);

    jest.mocked(useConfirmationContext).mockReturnValue({
      setIsHeadlessBuyInProgress: setIsHeadlessBuyInProgressMock,
    } as unknown as ReturnType<typeof useConfirmationContext>);

    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      txParams: {},
    } as unknown as TransactionMeta);

    jest.mocked(useTransactionPayFiatPayment).mockReturnValue(undefined);
  });

  it('returns isFiatPaymentSelected as false when no fiat payment', () => {
    const { result } = renderHook(() => useFiatConfirm());

    expect(result.current.isFiatPaymentSelected).toBe(false);
    expect(result.current.orderId).toBeUndefined();
  });

  it('returns isFiatPaymentSelected as true when payment method selected', () => {
    jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
    } as never);

    const { result } = renderHook(() => useFiatConfirm());

    expect(result.current.isFiatPaymentSelected).toBe(true);
  });

  it('returns orderId from fiat payment', () => {
    jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
      selectedPaymentMethodId: 'pm-123',
      orderId: 'order-abc',
    } as never);

    const { result } = renderHook(() => useFiatConfirm());

    expect(result.current.orderId).toBe('order-abc');
  });

  describe('onFiatConfirm', () => {
    it('does nothing when rampsQuote is missing', () => {
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        amountFiat: '50.00',
        caipAssetId: 'eip155:1/erc20:0xabc',
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      expect(startHeadlessBuyMock).not.toHaveBeenCalled();
      expect(setIsHeadlessBuyInProgressMock).not.toHaveBeenCalled();
    });

    it('does nothing when assetId is missing', () => {
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        amountFiat: '50.00',
        rampsQuote: { id: 'quote-1' },
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      expect(startHeadlessBuyMock).not.toHaveBeenCalled();
    });

    it('does nothing when amountFiat is missing', () => {
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        rampsQuote: { id: 'quote-1' },
        caipAssetId: 'eip155:1/erc20:0xabc',
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      expect(startHeadlessBuyMock).not.toHaveBeenCalled();
    });

    it('calls startHeadlessBuy with correct params when all data present', () => {
      const mockQuote = { id: 'quote-1', provider: 'test' };

      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        amountFiat: '50.00',
        rampsQuote: mockQuote,
        caipAssetId: 'eip155:1/erc20:0xabc',
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      expect(setIsHeadlessBuyInProgressMock).toHaveBeenCalledWith(true);
      expect(startHeadlessBuyMock).toHaveBeenCalledWith(
        {
          quote: mockQuote,
          assetId: 'eip155:1/erc20:0xabc',
          amount: 50,
          paymentMethodId: 'pm-123',
          currency: 'USD',
        },
        expect.objectContaining({
          onOrderCreated: expect.any(Function),
          onError: expect.any(Function),
          onClose: expect.any(Function),
        }),
      );
    });

    it('updates fiat payment with orderId on onOrderCreated callback', () => {
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        amountFiat: '50.00',
        rampsQuote: { id: 'quote-1' },
        caipAssetId: 'eip155:1/erc20:0xabc',
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      const callbacks = startHeadlessBuyMock.mock.calls[0][1];

      act(() => {
        callbacks.onOrderCreated('order-xyz');
      });

      expect(
        Engine.context.TransactionPayController.updateFiatPayment,
      ).toHaveBeenCalledWith({
        transactionId: TRANSACTION_ID_MOCK,
        callback: expect.any(Function),
      });

      const updateCall = jest.mocked(
        Engine.context.TransactionPayController.updateFiatPayment,
      ).mock.calls[0][0];
      const fiatPaymentObj = {} as { orderId?: string };
      (
        updateCall as { callback: (fp: typeof fiatPaymentObj) => void }
      ).callback(fiatPaymentObj);
      expect(fiatPaymentObj.orderId).toBe('order-xyz');
    });

    it('does not update fiat payment when transactionMetadata is missing', () => {
      jest
        .mocked(useTransactionMetadataRequest)
        .mockReturnValue(undefined as unknown as TransactionMeta);

      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        amountFiat: '50.00',
        rampsQuote: { id: 'quote-1' },
        caipAssetId: 'eip155:1/erc20:0xabc',
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      const callbacks = startHeadlessBuyMock.mock.calls[0][1];

      act(() => {
        callbacks.onOrderCreated('order-xyz');
      });

      expect(
        Engine.context.TransactionPayController.updateFiatPayment,
      ).not.toHaveBeenCalled();
    });

    it('resets headless buy in progress on error', () => {
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        amountFiat: '50.00',
        rampsQuote: { id: 'quote-1' },
        caipAssetId: 'eip155:1/erc20:0xabc',
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      const callbacks = startHeadlessBuyMock.mock.calls[0][1];

      act(() => {
        callbacks.onError(new Error('something went wrong'));
      });

      expect(setIsHeadlessBuyInProgressMock).toHaveBeenCalledWith(false);
    });

    it('resets headless buy in progress on close', () => {
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'pm-123',
        amountFiat: '50.00',
        rampsQuote: { id: 'quote-1' },
        caipAssetId: 'eip155:1/erc20:0xabc',
      } as never);

      const { result } = renderHook(() => useFiatConfirm());

      act(() => {
        result.current.onFiatConfirm();
      });

      const callbacks = startHeadlessBuyMock.mock.calls[0][1];

      act(() => {
        callbacks.onClose({ reason: 'user-closed' });
      });

      expect(setIsHeadlessBuyInProgressMock).toHaveBeenCalledWith(false);
    });
  });
});
