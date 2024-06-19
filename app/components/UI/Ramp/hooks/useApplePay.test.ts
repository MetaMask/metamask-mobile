import { QuoteResponse } from '@consensys/on-ramp-sdk';
import { ApplePayPurchaseStatus } from '@consensys/on-ramp-sdk/dist/ApplePay';
// @ts-expect-error ts(7016) react-native-payments is not typed
import { PaymentRequest } from '@metamask/react-native-payments';
import useApplePay from './useApplePay';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

jest.mock('@metamask/react-native-payments', () => ({
  PaymentRequest: jest.fn(),
}));

describe('useApplePay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error if quote does not support Apple Pay', async () => {
    const quote = {
      getApplePayRequestInfo: undefined,
      purchaseWithApplePay: undefined,
    } as QuoteResponse;
    const { result } = renderHookWithProvider(() => useApplePay(quote));
    const showRequest = result.current[0];
    await expect(showRequest()).rejects.toThrow(
      'Quote does not support Apple Pay',
    );
  });

  it('creates a PaymentRequest with applePayInfo and returns result if successful', async () => {
    const quote = {
      getApplePayRequestInfo: jest.fn().mockReturnValue({
        methodData: 'test-method-data',
        paymentDetails: 'test-payment-details',
        paymentOptions: 'test-payment-options',
      }),
      purchaseWithApplePay: jest.fn().mockResolvedValue({
        status: ApplePayPurchaseStatus.SUCCESS,
        order: 'test-order',
        authenticationUrl: 'test-auth-url',
      }),
      provider: {
        name: 'test-provider',
      },
    } as unknown as QuoteResponse;

    const mockPaymentRequestComplete = jest.fn();
    const mockPaymentRequestShow = jest.fn().mockResolvedValue({
      details: 'test-details',
      complete: mockPaymentRequestComplete,
    });
    const mockAbort = jest.fn();

    PaymentRequest.mockImplementation(() => ({
      show: mockPaymentRequestShow,
      abort: mockAbort,
    }));

    const { result } = renderHookWithProvider(() => useApplePay(quote));
    const showRequest = result.current[0];
    const paymentResult = await showRequest();

    expect(quote.getApplePayRequestInfo).toHaveBeenCalledWith({
      getPurchaseFiatAmountWithoutFeeLabel: expect.any(Function),
      getPurchaseFiatFeeLabel: expect.any(Function),
      getPurchaseFiatTotalAmountLabel: expect.any(Function),
    });

    expect(
      (
        quote.getApplePayRequestInfo as jest.Mock
      ).mock.calls[0][0].getPurchaseFiatAmountWithoutFeeLabel({
        symbol: 'TEST_SYMBOL',
      }),
    ).toBe('TEST_SYMBOL Purchase');
    expect(
      (
        quote.getApplePayRequestInfo as jest.Mock
      ).mock.calls[0][0].getPurchaseFiatFeeLabel(),
    ).toBe('Fee');
    expect(
      (
        quote.getApplePayRequestInfo as jest.Mock
      ).mock.calls[0][0].getPurchaseFiatTotalAmountLabel(),
    ).toBe('test-provider (via MetaMask)');

    expect(PaymentRequest).toHaveBeenCalledWith(
      'test-method-data',
      'test-payment-details',
      'test-payment-options',
    );

    expect(quote.purchaseWithApplePay).toHaveBeenCalledWith('test-details');
    expect(mockPaymentRequestShow).toHaveBeenCalled();
    expect(mockPaymentRequestComplete).toHaveBeenCalledWith('success');
    expect(mockAbort).not.toHaveBeenCalled();

    expect(paymentResult).toEqual({
      order: 'test-order',
      authenticationUrl: 'test-auth-url',
    });
  });

  it('throws if the paymentResponse is falsy', async () => {
    const quote = {
      getApplePayRequestInfo: jest.fn().mockReturnValue({
        methodData: 'test-method-data',
        paymentDetails: 'test-payment-details',
        paymentOptions: 'test-payment-options',
      }),
      purchaseWithApplePay: jest.fn().mockResolvedValue({
        status: ApplePayPurchaseStatus.SUCCESS,
        order: 'test-order',
        authenticationUrl: 'test-auth-url',
      }),
    } as unknown as QuoteResponse;

    const mockPaymentRequestShow = jest.fn().mockResolvedValue(null);
    const mockAbort = jest.fn();

    PaymentRequest.mockImplementation(() => ({
      show: mockPaymentRequestShow,
      abort: mockAbort,
    }));

    const { result } = renderHookWithProvider(() => useApplePay(quote));
    const showRequest = result.current[0];

    await expect(showRequest()).rejects.toThrow(
      'Payment Request Failed: empty apple pay response',
    );

    expect(mockAbort).toHaveBeenCalled();
  });

  it('throws if purchaseWithApplePay status is FAILURE with error', async () => {
    const quote = {
      getApplePayRequestInfo: jest.fn().mockReturnValue({
        methodData: 'test-method-data',
        paymentDetails: 'test-payment-details',
        paymentOptions: 'test-payment-options',
      }),
      purchaseWithApplePay: jest.fn().mockResolvedValue({
        status: ApplePayPurchaseStatus.FAILURE,
        error: 'test-error',
      }),
    } as unknown as QuoteResponse;

    const mockPaymentRequestComplete = jest.fn();
    const mockPaymentRequestShow = jest.fn().mockResolvedValue({
      details: 'test-details',
      complete: mockPaymentRequestComplete,
    });
    const mockAbort = jest.fn();

    PaymentRequest.mockImplementation(() => ({
      show: mockPaymentRequestShow,
      abort: mockAbort,
    }));

    const { result } = renderHookWithProvider(() => useApplePay(quote));
    const showRequest = result.current[0];
    await expect(showRequest()).rejects.toThrow('test-error');
    expect(mockPaymentRequestComplete).toHaveBeenCalledWith('fail');
    expect(mockAbort).toHaveBeenCalled();
  });

  it('throws if purchaseWithApplePay status is FAILURE with error object', async () => {
    const quote = {
      getApplePayRequestInfo: jest.fn().mockReturnValue({
        methodData: 'test-method-data',
        paymentDetails: 'test-payment-details',
        paymentOptions: 'test-payment-options',
      }),
      purchaseWithApplePay: jest.fn().mockResolvedValue({
        status: ApplePayPurchaseStatus.FAILURE,
        error: new Error('test-error-message'),
      }),
    } as unknown as QuoteResponse;

    const mockPaymentRequestComplete = jest.fn();
    const mockPaymentRequestShow = jest.fn().mockResolvedValue({
      details: 'test-details',
      complete: mockPaymentRequestComplete,
    });

    PaymentRequest.mockImplementation(() => ({
      show: mockPaymentRequestShow,
    }));

    const { result } = renderHookWithProvider(() => useApplePay(quote));
    const showRequest = result.current[0];
    await expect(showRequest()).rejects.toThrow('test-error-message');
    expect(mockPaymentRequestComplete).toHaveBeenCalledWith('fail');
  });

  it('returns ABORTED if error message includes AbortError', async () => {
    const quote = {
      getApplePayRequestInfo: jest.fn().mockReturnValue({
        methodData: 'test-method-data',
        paymentDetails: 'test-payment-details',
        paymentOptions: 'test-payment-options',
      }),
      purchaseWithApplePay: jest.fn(),
    } as unknown as QuoteResponse;

    const mockPaymentRequestShow = jest.fn().mockRejectedValue({
      message: 'AbortError',
    });

    PaymentRequest.mockImplementation(() => ({
      show: mockPaymentRequestShow,
    }));

    const { result } = renderHookWithProvider(() => useApplePay(quote));
    const showRequest = result.current[0];
    const paymentResult = await showRequest();
    expect(paymentResult).toEqual('ABORTED');
  });
});
