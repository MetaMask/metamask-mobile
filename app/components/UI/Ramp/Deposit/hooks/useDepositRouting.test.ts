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
      ).rejects.toThrow('An unexpected error occurred.');
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
  });
});
