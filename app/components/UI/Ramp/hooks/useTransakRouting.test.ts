import { renderHook, act } from '@testing-library/react-native';
import { useTransakRouting } from './useTransakRouting';

const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    themeAppearance: 'light',
    colors: {
      primary: { default: '#0376C9' },
      background: { default: '#FFFFFF' },
    },
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
  I18nEvents: {
    addListener: jest.fn(),
  },
}));

const mockHandleNewOrder = jest.fn();
jest.mock('../Deposit/hooks/useHandleNewOrder', () => ({
  __esModule: true,
  default: () => mockHandleNewOrder,
}));

const mockTrackEvent = jest.fn();
jest.mock('./useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

const mockGetUserDetails = jest.fn();
const mockGetKycRequirement = jest.fn();
const mockGetAdditionalRequirements = jest.fn();
const mockTransakCreateOrder = jest.fn();
const mockGetOrder = jest.fn();
const mockGetUserLimits = jest.fn();
const mockRequestOtt = jest.fn();
const mockGeneratePaymentWidgetUrl = jest.fn();
const mockSubmitPurposeOfUsageForm = jest.fn();
const mockLogoutFromProvider = jest.fn();

let mockUserRegion: unknown = {
  country: { currency: 'USD', isoCode: 'US' },
  regionCode: 'us-ca',
};
let mockSelectedPaymentMethod: unknown = {
  id: '/payments/debit-credit-card',
  isManualBankTransfer: false,
};

jest.mock('./useTransakController', () => ({
  useTransakController: () => ({
    userRegion: mockUserRegion,
    selectedPaymentMethod: mockSelectedPaymentMethod,
    logoutFromProvider: mockLogoutFromProvider,
    getUserDetails: mockGetUserDetails,
    getKycRequirement: mockGetKycRequirement,
    getAdditionalRequirements: mockGetAdditionalRequirements,
    createOrder: mockTransakCreateOrder,
    getOrder: mockGetOrder,
    getUserLimits: mockGetUserLimits,
    requestOtt: mockRequestOtt,
    generatePaymentWidgetUrl: mockGeneratePaymentWidgetUrl,
    submitPurposeOfUsageForm: mockSubmitPurposeOfUsageForm,
  }),
}));

jest.mock(
  '../../../../core/Engine/controllers/ramps-controller/transak-service-init',
  () => ({
    getTransakEnvironment: () => 'STAGING',
  }),
);

jest.mock('../Deposit/orderProcessor', () => ({
  depositOrderToFiatOrder: jest.fn((order) => ({
    ...order,
    orderType: 'BUY',
  })),
}));

jest.mock('../Deposit/utils', () => ({
  generateThemeParameters: jest.fn(() => ({ theme: 'light' })),
}));

jest.mock('../Views/Checkout', () => ({
  createCheckoutNavDetails: jest.fn(
    ({ url, providerName }: { url: string; providerName: string }) => [
      'Checkout',
      { url, providerName },
    ],
  ),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/ramps-controller', () => ({
  TransakOrderIdTransformer: {
    transakOrderIdToDepositOrderId: jest.fn(
      (orderId: string, _env: string) => `transformed-${orderId}`,
    ),
  },
}));

jest.mock('../Deposit/constants', () => ({
  REDIRECTION_URL: 'https://redirect.example.com',
}));

const mockQuote = {
  quoteId: 'test-quote-id',
  fiatAmount: 100,
  cryptoAmount: 0.05,
  fiatCurrency: 'USD',
};

describe('useTransakRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRegion = {
      country: { currency: 'USD', isoCode: 'US' },
      regionCode: 'us-ca',
    };
    mockSelectedPaymentMethod = {
      id: '/payments/debit-credit-card',
      isManualBankTransfer: false,
    };
  });

  it('returns expected functions', () => {
    const { result } = renderHook(() => useTransakRouting());

    expect(typeof result.current.routeAfterAuthentication).toBe('function');
    expect(typeof result.current.navigateToKycWebview).toBe('function');
    expect(typeof result.current.navigateToVerifyIdentity).toBe('function');
  });

  describe('routeAfterAuthentication', () => {
    it('navigates to BasicInfo when KYC status is NOT_SUBMITTED', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+1234567890',
        dob: '1990-01-01',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'NOT_SUBMITTED',
        kycType: 'SIMPLE',
      });

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RampBasicInfo',
        expect.objectContaining({
          quote: mockQuote,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({ ramp_type: 'DEPOSIT' }),
      );
    });

    it('navigates to webview for non-manual bank transfer when KYC is APPROVED', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+1',
        dob: '1990-01-01',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': 10000, '30': 50000, '365': 200000 },
      });
      mockRequestOtt.mockResolvedValue({ ott: 'test-ott' });
      mockGeneratePaymentWidgetUrl.mockReturnValue(
        'https://payment.example.com',
      );

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never);
      });

      expect(mockRequestOtt).toHaveBeenCalled();
      expect(mockGeneratePaymentWidgetUrl).toHaveBeenCalledWith(
        'test-ott',
        mockQuote,
        '',
        expect.any(Object),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          url: 'https://payment.example.com',
          providerName: 'Transak',
        }),
      );
    });

    it('navigates to bank details for manual bank transfer when KYC is APPROVED', async () => {
      mockSelectedPaymentMethod = {
        id: '/payments/bank-transfer',
        isManualBankTransfer: true,
      };
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+1',
        dob: '1990-01-01',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': 10000, '30': 50000, '365': 200000 },
      });
      mockTransakCreateOrder.mockResolvedValue({
        id: 'order-123',
        walletAddress: '0xabc',
      });
      mockHandleNewOrder.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never);
      });

      expect(mockTransakCreateOrder).toHaveBeenCalledWith(
        'test-quote-id',
        '',
        '/payments/bank-transfer',
      );
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          routes: [
            expect.objectContaining({
              params: expect.objectContaining({ orderId: 'order-123' }),
            }),
          ],
        }),
      );
    });

    it('navigates to KycProcessing when KYC status is SUBMITTED', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'SUBMITTED',
        kycType: 'STANDARD',
      });

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RampKycProcessing',
        expect.objectContaining({ quote: mockQuote }),
      );
    });

    it('handles 401 error by logging out and navigating to enter email', async () => {
      const error = new Error('Unauthorized') as Error & { status: number };
      error.status = 401;
      mockGetUserDetails.mockRejectedValue(error);
      mockLogoutFromProvider.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never);
      });

      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith('RampEnterEmail');
    });

    it('handles ADDITIONAL_FORMS_REQUIRED with PURPOSE_OF_USAGE', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'ADDITIONAL_FORMS_REQUIRED',
        kycType: 'STANDARD',
      });
      mockGetAdditionalRequirements.mockResolvedValue({
        formsRequired: [{ type: 'PURPOSE_OF_USAGE' }],
      });
      mockSubmitPurposeOfUsageForm.mockResolvedValue(undefined);

      mockGetKycRequirement
        .mockResolvedValueOnce({
          status: 'ADDITIONAL_FORMS_REQUIRED',
          kycType: 'STANDARD',
        })
        .mockResolvedValueOnce({
          status: 'SUBMITTED',
          kycType: 'STANDARD',
        });

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never);
      });

      expect(mockSubmitPurposeOfUsageForm).toHaveBeenCalledWith([
        'Buying/selling crypto for investments',
      ]);
    });

    it('handles ADDITIONAL_FORMS_REQUIRED with IDPROOF', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'ADDITIONAL_FORMS_REQUIRED',
        kycType: 'STANDARD',
      });
      mockGetAdditionalRequirements.mockResolvedValue({
        formsRequired: [
          {
            type: 'IDPROOF',
            metadata: {
              kycUrl: 'https://kyc.example.com',
              workFlowRunId: 'wf-123',
            },
          },
        ],
      });

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RampAdditionalVerification',
        expect.objectContaining({
          quote: mockQuote,
          kycUrl: 'https://kyc.example.com',
          workFlowRunId: 'wf-123',
        }),
      );
    });

    it('throws LimitExceededError when daily limit is exceeded', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': 50, '30': 50000, '365': 200000 },
      });

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(mockQuote as never);
        }),
      ).rejects.toThrow();
    });
  });

  describe('navigateToVerifyIdentity', () => {
    it('navigates to the verify identity route', () => {
      const { result } = renderHook(() => useTransakRouting());

      act(() => {
        result.current.navigateToVerifyIdentity({ quote: mockQuote as never });
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RampVerifyIdentity',
        expect.objectContaining({ quote: mockQuote }),
      );
    });
  });

  describe('navigateToKycWebview', () => {
    it('navigates to the KYC webview', () => {
      const { result } = renderHook(() => useTransakRouting());

      act(() => {
        result.current.navigateToKycWebview({
          quote: mockQuote as never,
          kycUrl: 'https://kyc.example.com',
          workFlowRunId: 'wf-123',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          url: 'https://kyc.example.com',
          providerName: 'Transak',
        }),
      );
    });
  });
});
