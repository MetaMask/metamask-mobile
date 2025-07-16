import { AxiosError } from 'axios';
import { renderHook } from '@testing-library/react-hooks';
import { useDepositRouting } from './useDepositRouting';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import {
  WIRE_TRANSFER_PAYMENT_METHOD,
  SEPA_PAYMENT_METHOD,
} from '../constants';
import useHandleNewOrder from './useHandleNewOrder';

jest.mock('@react-navigation/compat', () => ({
  withNavigation: jest.fn((component) => component),
}));

const mockUseDepositSdkMethodInitialState = {
  data: null,
  error: null as string | null,
  isFetching: false,
};

let mockFetchKycForms = jest.fn().mockResolvedValue({ forms: [] });
let mockFetchKycFormData = jest
  .fn()
  .mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } });
let mockFetchUserDetails = jest
  .fn()
  .mockResolvedValue({ kyc: { l1: { status: 'APPROVED' } } });
let mockCreateReservation = jest
  .fn()
  .mockResolvedValue({ id: 'reservation-id' });
let mockCreateOrder = jest
  .fn()
  .mockResolvedValue({ id: 'order-id', walletAddress: '0x123' });
let mockSubmitPurposeOfUsage = jest.fn().mockResolvedValue(undefined);
let mockRequestOtt = jest.fn().mockResolvedValue({ token: 'test-ott-token' });
let mockGeneratePaymentUrl = jest.fn().mockResolvedValue('https://payment.url');
let mockGetOrder = jest.fn().mockResolvedValue({
  id: 'order-id',
  walletAddress: '0x123',
  cryptoCurrency: 'USDC',
  network: 'ethereum',
});

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

const verifyPopToBuildQuoteCalled = () => {
  expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
  const dispatchCall = mockDispatch.mock.calls.find(
    (call) => typeof call[0] === 'function',
  );
  const dispatchFunction = dispatchCall?.[0];
  const mockState = {
    routes: [
      { name: 'SomeOtherScreen' },
      { name: 'BuildQuote' },
      { name: 'CurrentScreen' },
    ],
    length: 3,
  };
  const action = dispatchFunction(mockState);
  expect(action).toEqual(
    expect.objectContaining({
      type: 'POP',
      payload: expect.objectContaining({
        count: 1,
        params: { animationEnabled: false },
      }),
    }),
  );
};

jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn((config) => {
    if (config?.method === 'getKYCForms') {
      return [mockUseDepositSdkMethodInitialState, mockFetchKycForms];
    }
    if (config?.method === 'getKycForm') {
      return [mockUseDepositSdkMethodInitialState, mockFetchKycFormData];
    }
    if (config?.method === 'getUserDetails') {
      return [mockUseDepositSdkMethodInitialState, mockFetchUserDetails];
    }
    if (config?.method === 'walletReserve') {
      return [mockUseDepositSdkMethodInitialState, mockCreateReservation];
    }
    if (config?.method === 'createOrder') {
      return [mockUseDepositSdkMethodInitialState, mockCreateOrder];
    }
    if (config?.method === 'submitPurposeOfUsageForm') {
      return [mockUseDepositSdkMethodInitialState, mockSubmitPurposeOfUsage];
    }
    if (config?.method === 'requestOtt') {
      return [mockUseDepositSdkMethodInitialState, mockRequestOtt];
    }
    if (config?.method === 'generatePaymentWidgetUrl') {
      return [mockUseDepositSdkMethodInitialState, mockGeneratePaymentUrl];
    }
    if (config?.method === 'getOrder') {
      return [mockUseDepositSdkMethodInitialState, mockGetOrder];
    }
    return [mockUseDepositSdkMethodInitialState, jest.fn()];
  }),
}));

const mockClearAuthToken = jest.fn();

jest.mock('../sdk', () => ({
  useDepositSDK: jest.fn(() => ({
    selectedRegion: { isoCode: 'US' },
    clearAuthToken: mockClearAuthToken,
    selectedWalletAddress: '0x123',
  })),
}));

jest.mock('./useHandleNewOrder');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => '0x123'),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }),
}));

jest.mock('../orderProcessor', () => ({
  depositOrderToFiatOrder: jest.fn((order) => order),
}));

const mockUseHandleNewOrder = jest.mocked(useHandleNewOrder);

describe('useDepositRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchKycForms = jest.fn().mockResolvedValue({ forms: [] });
    mockFetchKycFormData = jest
      .fn()
      .mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } });
    mockFetchUserDetails = jest
      .fn()
      .mockResolvedValue({ kyc: { l1: { status: 'APPROVED' } } });
    mockCreateReservation = jest
      .fn()
      .mockResolvedValue({ id: 'reservation-id' });
    mockCreateOrder = jest
      .fn()
      .mockResolvedValue({ id: 'order-id', walletAddress: '0x123' });
    mockSubmitPurposeOfUsage = jest.fn().mockResolvedValue(undefined);
    mockRequestOtt = jest.fn().mockResolvedValue({ token: 'test-ott-token' });
    mockGeneratePaymentUrl = jest.fn().mockResolvedValue('https://payment.url');
    mockGetOrder = jest.fn().mockResolvedValue({
      id: 'order-id',
      walletAddress: '0x123',
      cryptoCurrency: 'USDC',
      network: 'ethereum',
    });

    mockUseHandleNewOrder.mockReturnValue(
      jest.fn().mockResolvedValue(undefined),
    );

    mockDispatch.mockImplementation((actionOrFunction) => {
      if (typeof actionOrFunction === 'function') {
        const mockState = {
          routes: [
            { name: 'SomeOtherScreen' },
            { name: 'BuildQuote' },
            { name: 'CurrentScreen' },
          ],
          length: 3,
        };
        return actionOrFunction(mockState);
      }
      return actionOrFunction;
    });
  });

  it('should create the hook with correct parameters', () => {
    const mockParams = {
      cryptoCurrencyChainId: 'eip155:1',
      paymentMethodId: WIRE_TRANSFER_PAYMENT_METHOD.id,
    };

    const { result } = renderHook(() => useDepositRouting(mockParams));

    expect(result.current.routeAfterAuthentication).toBeDefined();
    expect(result.current.navigateToKycWebview).toBeDefined();
    expect(result.current.handleApprovedKycFlow).toBeDefined();
    expect(typeof result.current.routeAfterAuthentication).toBe('function');
    expect(typeof result.current.navigateToKycWebview).toBe('function');
    expect(typeof result.current.handleApprovedKycFlow).toBe('function');
  });

  describe('Manual bank transfer payment method routing', () => {
    it('should navigate to BankDetails when manual bank transfer payment method is used and KYC is approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: WIRE_TRANSFER_PAYMENT_METHOD.id,
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchUserDetails).toHaveBeenCalled();
      expect(mockCreateReservation).toHaveBeenCalledWith(mockQuote, '0x123');
      expect(mockCreateOrder).toHaveBeenCalledWith({ id: 'reservation-id' });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BankDetails', {
        orderId: 'order-id',
        shouldUpdate: false,
      });
    });

    it('should throw error when manual bank transfer reservation fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: WIRE_TRANSFER_PAYMENT_METHOD.id,
      };

      mockCreateReservation = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Missing reservation');
    });
  });

  describe('Non-SEPA payment method routing', () => {
    it('should navigate to WebviewModal when non-SEPA payment method is used and KYC is approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchUserDetails).toHaveBeenCalled();
      expect(mockRequestOtt).toHaveBeenCalled();
      expect(mockGeneratePaymentUrl).toHaveBeenCalledWith(
        'test-ott-token',
        mockQuote,
        '0x123',
        expect.objectContaining({
          themeColor: expect.any(String),
          colorMode: expect.any(String),
          backgroundColors: expect.any(String),
          textColors: expect.any(String),
          borderColors: expect.any(String),
        }),
      );

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositWebviewModal',
        params: {
          sourceUrl: 'https://payment.url',
          handleNavigationStateChange: expect.any(Function),
        },
      });
    });
  });

  describe('KYC forms routing', () => {
    it('should navigate to BasicInfo when personalDetails form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'personalDetails' }, { id: 'idProof' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
        id: 'idProof',
      });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        kycUrl: 'test-kyc-url',
      });
    });

    it('should navigate to BasicInfo when address form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'address' }, { id: 'idProof' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
        id: 'idProof',
      });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        kycUrl: 'test-kyc-url',
      });
    });

    it('should navigate to BasicInfo when SSN form is required for US user', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'usSSN' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        kycUrl: undefined,
      });
    });

    it('should auto-submit purpose of usage form when it is the only remaining form', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest
        .fn()
        .mockResolvedValueOnce({
          forms: [{ id: 'purposeOfUsage' }],
        })
        .mockResolvedValueOnce({
          forms: [],
        });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockSubmitPurposeOfUsage).toHaveBeenCalledWith([
        'Buying/selling crypto for investments',
      ]);
      expect(mockFetchKycForms).toHaveBeenCalledTimes(2);
      expect(mockRequestOtt).toHaveBeenCalled();
      expect(mockGeneratePaymentUrl).toHaveBeenCalled();

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositWebviewModal',
        params: expect.objectContaining({
          sourceUrl: 'https://payment.url',
        }),
      });
    });

    it('should navigate to KYC webview when only idProof form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'idProof' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
        id: 'idProof',
      });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositKycWebviewModal',
        params: {
          quote: mockQuote,
          sourceUrl: 'test-kyc-url',
        },
      });
    });

    it('should throw error when idProof form exists but no form data is returned', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'idProof' }],
      });
      mockFetchKycFormData = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('An unexpected error occurred.');
    });
  });

  describe('handleApprovedKycFlow method', () => {
    it('should handle SEPA payment flow correctly', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const success = await result.current.handleApprovedKycFlow(mockQuote);

      expect(success).toBe(true);
      expect(mockCreateReservation).toHaveBeenCalledWith(mockQuote, '0x123');
      expect(mockCreateOrder).toHaveBeenCalled();

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BankDetails', {
        orderId: 'order-id',
        shouldUpdate: false,
      });
    });

    it('should handle non-SEPA payment flow correctly', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const success = await result.current.handleApprovedKycFlow(mockQuote);

      expect(success).toBe(true);
      expect(mockRequestOtt).toHaveBeenCalled();
      expect(mockGeneratePaymentUrl).toHaveBeenCalledWith(
        'test-ott-token',
        mockQuote,
        '0x123',
        expect.objectContaining({
          themeColor: expect.any(String),
          colorMode: expect.any(String),
          backgroundColors: expect.any(String),
          textColors: expect.any(String),
          borderColors: expect.any(String),
        }),
      );

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositWebviewModal',
        params: expect.objectContaining({
          sourceUrl: 'https://payment.url',
          handleNavigationStateChange: expect.any(Function),
        }),
      });
    });

    it('should navigate to KycProcessing when KYC is not approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchUserDetails = jest
        .fn()
        .mockResolvedValue({ kyc: { l1: { status: 'PENDING' } } });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const success = await result.current.handleApprovedKycFlow(mockQuote);

      expect(success).toBe(false);

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('KycProcessing', {
        quote: mockQuote,
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when user details are missing', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      mockFetchUserDetails = jest.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useDepositRouting(mockParams));
      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Missing user details');
    });

    it('should throw error when KYC forms fetch fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest
        .fn()
        .mockRejectedValue(new Error('KYC forms fetch failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('KYC forms fetch failed');
    });

    it('should throw error when payment URL generation fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockGeneratePaymentUrl = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Failed to generate payment URL');
    });
  });

  describe('401 Unauthorized handling', () => {
    it('navigates to Login when user is unauthorized', async () => {
      const mockQuote = {} as BuyQuote;

      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      mockFetchKycForms = jest.fn().mockImplementation(() => {
        const error = new Error('Unauthorized');
        (error as AxiosError).status = 401;
        throw error;
      });
      const { result } = renderHook(() => useDepositRouting(mockParams));
      await result.current.routeAfterAuthentication(mockQuote);
      expect(mockClearAuthToken).toHaveBeenCalled();

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "EnterEmail",
            {
              "cryptoCurrencyChainId": "eip155:1",
              "paymentMethodId": "credit_debit_card",
              "quote": {},
            },
          ],
        ]
      `);
    });
  });

  describe('401 Unauthorized handling', () => {
    it('navigates to Login when user is unauthorized', async () => {
      const mockQuote = {} as BuyQuote;

      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      mockFetchKycForms = jest.fn().mockImplementation(() => {
        const error = new Error('Unauthorized');
        (error as AxiosError).status = 401;
        throw error;
      });
      const { result } = renderHook(() => useDepositRouting(mockParams));
      await result.current.routeAfterAuthentication(mockQuote);
      expect(mockClearAuthToken).toHaveBeenCalled();
      expect(mockNavigate.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "EnterEmail",
            {
              "cryptoCurrencyChainId": "eip155:1",
              "paymentMethodId": "credit_debit_card",
              "quote": {},
            },
          ],
        ]
      `);
    });
  });

  describe('handleNavigationStateChange', () => {
    it('processes order and navigates when URL contains orderId', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      const mockHandleNewOrder = jest.fn().mockResolvedValue(undefined);
      mockUseHandleNewOrder.mockReturnValue(mockHandleNewOrder);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.handleApprovedKycFlow(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      expect(handler).toBeDefined();

      await handler({
        url: 'https://metamask.io/success?orderId=test-order-id',
      });

      expect(mockGetOrder).toHaveBeenCalledWith('test-order-id', '0x123');
      expect(mockHandleNewOrder).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('OrderProcessing', {
        orderId: 'order-id',
      });
    });

    it('does nothing when URL does not start with metamask.io', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.handleApprovedKycFlow(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      jest.clearAllMocks();

      await handler({
        url: 'https://example.com/success?orderId=test-order-id',
      });

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does nothing when metamask.io URL has no orderId', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.handleApprovedKycFlow(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      jest.clearAllMocks();

      await handler({ url: 'https://metamask.io/success' });

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles error when getOrder fails', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockGetOrder = jest.fn().mockRejectedValue(new Error('Get order failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.handleApprovedKycFlow(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      jest.clearAllMocks();

      await handler({
        url: 'https://metamask.io/success?orderId=test-order-id',
      });

      expect(mockGetOrder).toHaveBeenCalledWith('test-order-id', '0x123');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles error when getOrder returns null', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockGetOrder = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.handleApprovedKycFlow(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      jest.clearAllMocks();

      await handler({
        url: 'https://metamask.io/success?orderId=test-order-id',
      });

      expect(mockGetOrder).toHaveBeenCalledWith('test-order-id', '0x123');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Additional error handling coverage', () => {
    it('should throw error when OTT token request fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockRequestOtt = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.handleApprovedKycFlow(mockQuote),
      ).rejects.toThrow('Failed to get OTT token');
    });

    it('should throw error when createOrder fails for SEPA flow', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };

      mockCreateOrder = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.handleApprovedKycFlow(mockQuote),
      ).rejects.toThrow('Missing order');
    });

    it('should throw error when createOrder throws for SEPA flow', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };

      mockCreateOrder = jest
        .fn()
        .mockRejectedValue(new Error('Order creation failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.handleApprovedKycFlow(mockQuote),
      ).rejects.toThrow('Order creation failed');
    });

    it('should throw error when requestOtt throws for non-SEPA flow', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockRequestOtt = jest
        .fn()
        .mockRejectedValue(new Error('OTT request failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.handleApprovedKycFlow(mockQuote),
      ).rejects.toThrow('OTT request failed');
    });

    it('should throw error when generatePaymentUrl throws for non-SEPA flow', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockGeneratePaymentUrl = jest
        .fn()
        .mockRejectedValue(new Error('Payment URL generation failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.handleApprovedKycFlow(mockQuote),
      ).rejects.toThrow('Payment URL generation failed');
    });

    it('should throw error when fetchUserDetails throws in handleApprovedKycFlow', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchUserDetails = jest
        .fn()
        .mockRejectedValue(new Error('User details fetch failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.handleApprovedKycFlow(mockQuote),
      ).rejects.toThrow('User details fetch failed');
    });
  });

  describe('Navigation callback methods', () => {
    it('should call popToBuildQuote before navigating in navigateToVerifyIdentity', () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      result.current.navigateToVerifyIdentity({ quote: mockQuote });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('VerifyIdentity', {
        quote: mockQuote,
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      });
    });

    it('should call popToBuildQuote before navigating in navigateToEnterEmail', () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      result.current.navigateToEnterEmail({ quote: mockQuote });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('EnterEmail', {
        quote: mockQuote,
        paymentMethodId: 'credit_debit_card',
        cryptoCurrencyChainId: 'eip155:1',
      });
    });

    it('should call popToBuildQuote before navigating in navigateToBasicInfo', () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      result.current.navigateToBasicInfo({ quote: mockQuote });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
      });
    });

    it('should call popToBuildQuote before navigating in navigateToKycWebview', () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      result.current.navigateToKycWebview({
        quote: mockQuote,
        kycUrl: 'test-url',
      });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositKycWebviewModal',
        params: {
          quote: mockQuote,
          sourceUrl: 'test-url',
        },
      });
    });
  });
});
