import { AxiosError } from 'axios';
import { renderHook } from '@testing-library/react-hooks';
import { useDepositRouting } from './useDepositRouting';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import {
  WIRE_TRANSFER_PAYMENT_METHOD,
  KycStatus,
  REDIRECTION_URL,
} from '../constants';
import useHandleNewOrder from './useHandleNewOrder';
import { createEnterEmailNavDetails } from '../Views/EnterEmail/EnterEmail';
import { endTrace } from '../../../../../util/trace';

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
  .mockResolvedValue({ kyc: { l1: { status: KycStatus.APPROVED } } });
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
  network: 'eip155:1',
  fiatAmount: '100',
  cryptoAmount: '0.05',
  exchangeRate: '2000',
  totalFeesFiat: '2.50',
  networkFees: '2.50',
  partnerFees: '2.50',
  paymentMethod: 'credit_debit_card',
  fiatCurrency: 'USD',
});

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockReset = jest.fn();

jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

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

const mockLogoutFromProvider = jest.fn();
const mockSelectedRegion = { isoCode: 'US' };

jest.mock('../sdk', () => ({
  useDepositSDK: jest.fn(() => ({
    selectedRegion: mockSelectedRegion,
    logoutFromProvider: mockLogoutFromProvider,
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
    reset: mockReset,
  }),
}));

jest.mock('../orderProcessor', () => ({
  depositOrderToFiatOrder: jest.fn((order) => order),
}));

jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

jest.mock('../../../../../util/trace', () => ({
  endTrace: jest.fn(),
  TraceName: {
    DepositContinueFlow: 'Deposit Continue Flow',
    DepositInputOtp: 'Deposit Input OTP',
  },
}));

const mockUseHandleNewOrder = jest.mocked(useHandleNewOrder);

const mockPreviousFormData = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  countryCode: '',
  dob: '',
  firstName: '',
  lastName: '',
  mobileNumber: '',
  postCode: '',
  state: '',
};

describe('useDepositRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchKycForms = jest.fn().mockResolvedValue({ forms: [] });
    mockFetchKycFormData = jest
      .fn()
      .mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } });
    mockFetchUserDetails = jest
      .fn()
      .mockResolvedValue({ kyc: { l1: { status: KycStatus.APPROVED } } });
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
      networkFees: '5.99',
      partnerFees: '5.99',
    });

    mockUseHandleNewOrder.mockReturnValue(
      jest.fn().mockResolvedValue(undefined),
    );

    mockTrackEvent.mockClear();

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
    expect(result.current.navigateToVerifyIdentity).toBeDefined();
    expect(typeof result.current.routeAfterAuthentication).toBe('function');
    expect(typeof result.current.navigateToKycWebview).toBe('function');
    expect(typeof result.current.navigateToVerifyIdentity).toBe('function');
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

      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: 'BankDetails',
            params: { orderId: 'order-id', shouldUpdate: false },
          },
        ],
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

    it('should call endTrace for both DepositContinueFlow and DepositInputOtp when navigating to WebviewModal', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
      mockEndTrace.mockClear();

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockEndTrace).toHaveBeenCalledTimes(2);
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: 'Deposit Continue Flow',
        data: {
          destination: 'DepositWebviewModal',
          isPaymentWebview: true,
        },
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: 'Deposit Input OTP',
        data: {
          destination: 'DepositWebviewModal',
        },
      });
    });
  });

  describe('KYC forms routing', () => {
    it('should navigate to BasicInfo when personalDetails form is not submitted', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: true },
          { id: 'personalDetails', isSubmitted: false },
          { id: 'address', isSubmitted: true },
          { id: 'idProof', isSubmitted: true },
        ],
        kycType: 'SIMPLE',
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        previousFormData: mockPreviousFormData,
      });
    });

    it('should navigate to BasicInfo when address form is not submitted', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: true },
          { id: 'personalDetails', isSubmitted: true },
          { id: 'address', isSubmitted: false },
          { id: 'idProof', isSubmitted: true },
        ],
        kycType: 'SIMPLE',
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        previousFormData: mockPreviousFormData,
      });
    });

    it('should navigate to BasicInfo when SSN form is not submitted for US user', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: true },
          { id: 'personalDetails', isSubmitted: false },
          { id: 'address', isSubmitted: true },
          { id: 'usSSN', isSubmitted: false },
        ],
        kycType: 'SIMPLE',
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        previousFormData: mockPreviousFormData,
      });
    });

    it('should auto-submit purpose of usage form when it is not submitted', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            forms: [{ id: 'purposeOfUsage', isSubmitted: false }],
          }),
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            forms: [],
          }),
        );

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

    it('should navigate to AdditionalVerification when idProof form is not submitted', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: true },
          { id: 'personalDetails', isSubmitted: true },
          { id: 'address', isSubmitted: true },
          { id: 'idProof', isSubmitted: false },
        ],
      });
      mockFetchKycFormData = jest.fn().mockResolvedValue({
        data: {
          kycUrl: 'test-kyc-url',
          workFlowRunId: 'test-workflow-run-id',
        },
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
        id: 'idProof',
        isSubmitted: false,
      });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('AdditionalVerification', {
        quote: mockQuote,
        kycUrl: 'test-kyc-url',
        kycWorkflowRunId: 'test-workflow-run-id',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      });
    });

    it('should throw error when idProof form is not submitted but no form data is returned', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: true },
          { id: 'personalDetails', isSubmitted: true },
          { id: 'address', isSubmitted: true },
          { id: 'idProof', isSubmitted: false },
        ],
      });
      mockFetchKycFormData = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('An unexpected error occurred.');
    });

    it('should throw error when all forms are submitted but no clear next step exists', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'personalDetails', isSubmitted: true },
          { id: 'address', isSubmitted: true },
          { id: 'usSSN', isSubmitted: true },
        ],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('An unexpected error occurred.');

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'BasicInfo',
        expect.any(Object),
      );
    });

    it('should not auto-submit purpose of usage form when it is already submitted', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: true },
          { id: 'personalDetails', isSubmitted: false },
        ],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockSubmitPurposeOfUsage).not.toHaveBeenCalled();
      expect(mockFetchKycForms).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        previousFormData: mockPreviousFormData,
      });
    });

    it('should not auto-submit purpose of usage form when depth limit is exceeded', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      // Always return the unsubmitted form, so recursion hits the depth limit
      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: false },
          { id: 'personalDetails', isSubmitted: true },
          { id: 'address', isSubmitted: true },
        ],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      // The function should log an error but not throw
      expect(mockSubmitPurposeOfUsage).toHaveBeenCalledTimes(5);
    });
  });

  describe('KYC status handling', () => {
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

      const success = await result.current.routeAfterAuthentication(mockQuote);

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

    it('should throw error when OTT token request fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockRequestOtt = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Failed to get OTT token');
    });

    it('should throw error when createOrder fails for manual bank transfer flow', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: WIRE_TRANSFER_PAYMENT_METHOD.id,
      };

      mockCreateOrder = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Missing order');
    });

    it('should throw error when createOrder throws for manual bank transfer flow', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: WIRE_TRANSFER_PAYMENT_METHOD.id,
      };

      mockCreateOrder = jest
        .fn()
        .mockRejectedValue(new Error('Order creation failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Order creation failed');
    });

    it('should throw error when requestOtt throws for non-manual bank transfer flow', async () => {
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
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('OTT request failed');
    });

    it('should throw error when generatePaymentUrl throws for non-manual bank transfer flow', async () => {
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
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Payment URL generation failed');
    });

    it('should throw error when fetchUserDetails throws', async () => {
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
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('User details fetch failed');
    });
  });

  describe('401 Unauthorized handling', () => {
    it('navigates to Login when user is unauthorized', async () => {
      const mockQuote = {} as BuyQuote;

      const mockParams = {
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
      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        ...createEnterEmailNavDetails({}),
      );
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
      await result.current.routeAfterAuthentication(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      expect(handler).toBeDefined();

      await handler({
        url: `${REDIRECTION_URL}?orderId=test-order-id`,
      });

      expect(mockGetOrder).toHaveBeenCalledWith('test-order-id', '0x123');
      expect(mockHandleNewOrder).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('OrderProcessing', {
        orderId: '/providers/transak-native/orders/test-order-id',
      });
    });

    it('tracks RAMPS_TRANSACTION_CONFIRMED event when order is processed successfully', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      const mockHandleNewOrder = jest.fn().mockResolvedValue(undefined);
      mockUseHandleNewOrder.mockReturnValue(mockHandleNewOrder);

      const testOrder = {
        id: 'order-id',
        walletAddress: '0x123',
        cryptoCurrency: 'USDC',
        network: 'ethereum',
        fiatAmount: '100',
        cryptoAmount: '0.05',
        exchangeRate: '2000',
        totalFeesFiat: '2.50',
        networkFees: '0',
        partnerFees: '0',
        paymentMethod: 'credit_debit_card',
        fiatCurrency: 'USD',
      };
      mockGetOrder.mockResolvedValue(testOrder);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.routeAfterAuthentication(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      mockTrackEvent.mockClear();

      await handler({
        url: `${REDIRECTION_URL}?orderId=test-order-id`,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_TRANSACTION_CONFIRMED',
        {
          ramp_type: 'DEPOSIT',
          amount_source: 100,
          amount_destination: 0.05,
          exchange_rate: 2000,
          gas_fee: 0,
          processing_fee: 0,
          total_fee: 2.5,
          payment_method_id: 'credit_debit_card',
          country: 'US',
          chain_id: 'eip155:1',
          currency_destination:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency_source: 'USD',
        },
      );
    });

    it('does not track analytics when order processing fails', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      const mockHandleNewOrder = jest
        .fn()
        .mockRejectedValue(new Error('Processing failed'));
      mockUseHandleNewOrder.mockReturnValue(mockHandleNewOrder);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.routeAfterAuthentication(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      mockTrackEvent.mockClear();
      mockNavigate.mockClear();

      await handler({
        url: `${REDIRECTION_URL}?orderId=test-order-id`,
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('OrderProcessing', {
        orderId: '/providers/transak-native/orders/test-order-id',
      });
    });

    it('does nothing when URL does not start with REDIRECTION_URL', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.routeAfterAuthentication(mockQuote);

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
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does nothing when REDIRECTION_URL has no orderId', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.routeAfterAuthentication(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      jest.clearAllMocks();

      await handler({ url: REDIRECTION_URL });

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('handles error when getOrder fails', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      const mockHandleNewOrder = jest.fn().mockResolvedValue(undefined);
      mockUseHandleNewOrder.mockReturnValue(mockHandleNewOrder);

      mockGetOrder = jest.fn().mockRejectedValue(new Error('Get order failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.routeAfterAuthentication(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      jest.clearAllMocks();

      await handler({
        url: `${REDIRECTION_URL}?orderId=test-order-id`,
      });

      expect(mockGetOrder).toHaveBeenCalledWith('test-order-id', '0x123');
      expect(mockNavigate).toHaveBeenCalledWith('OrderProcessing', {
        orderId: '/providers/transak-native/orders/test-order-id',
      });
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('handles error when getOrder returns null', async () => {
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      const mockHandleNewOrder = jest.fn().mockResolvedValue(undefined);
      mockUseHandleNewOrder.mockReturnValue(mockHandleNewOrder);

      mockGetOrder = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      const mockQuote = {} as BuyQuote;
      await result.current.routeAfterAuthentication(mockQuote);

      const navigateCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'DepositModals' &&
          call[1]?.params?.handleNavigationStateChange,
      );
      const handler = navigateCall?.[1]?.params?.handleNavigationStateChange;

      jest.clearAllMocks();

      await handler({
        url: `${REDIRECTION_URL}?orderId=test-order-id`,
      });

      expect(mockGetOrder).toHaveBeenCalledWith('test-order-id', '0x123');
      expect(mockNavigate).toHaveBeenCalledWith('OrderProcessing', {
        orderId: '/providers/transak-native/orders/test-order-id',
      });
      expect(mockTrackEvent).not.toHaveBeenCalled();
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
        kycWorkflowRunId: 'test-workflow-id',
      });

      verifyPopToBuildQuoteCalled();
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositKycWebviewModal',
        params: {
          quote: mockQuote,
          sourceUrl: 'test-url',
          kycWorkflowRunId: 'test-workflow-id',
          cryptoCurrencyChainId: 'eip155:1',
          paymentMethodId: 'credit_debit_card',
        },
      });
    });
  });

  describe('Analytics tracking', () => {
    it('tracks RAMPS_KYC_STARTED event when personalDetails form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [
          { id: 'purposeOfUsage', isSubmitted: true },
          { id: 'personalDetails', isSubmitted: false },
          { id: 'address', isSubmitted: true },
        ],
        kycType: 'SIMPLE',
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_KYC_STARTED', {
        ramp_type: 'DEPOSIT',
        kyc_type: 'SIMPLE',
        region: 'US',
      });
    });

    it('does not track analytics event when no KYC forms are required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [],
        kycType: 'NONE',
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
