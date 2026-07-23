import { renderHook, act } from '@testing-library/react-native';
import {
  RampsOrderStatus,
  type TransakBuyQuote,
} from '@metamask/ramps-controller';
import { useTransakRouting } from './useTransakRouting';
import { extractOrderCode } from '../utils/extractOrderCode';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockParentPop = jest.fn();
const mockGetParent = jest.fn(() => ({ pop: mockParentPop }));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
    getParent: mockGetParent,
  }),
}));

jest.mock('../headless/sessionRegistry', () => ({
  getSession: jest.fn(),
  closeSession: jest.fn(),
  failSession: jest.fn(),
}));

jest.mock('../headless', () => ({
  getChainIdFromAssetId: (assetId: string) => {
    const slashIndex = assetId.indexOf('/');
    return slashIndex <= 0 ? null : assetId.slice(0, slashIndex);
  },
}));

const mockSetHeadlessOrderContext = jest.fn();
jest.mock(
  '../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
  () => ({
    setHeadlessOrderContext: (
      ...args: Parameters<typeof mockSetHeadlessOrderContext>
    ) => mockSetHeadlessOrderContext(...args),
  }),
);

const MOCK_WALLET_ADDRESS = '0xabcdef1234567890';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({
    selected: {
      chainId: 'eip155:1',
      assetId: 'eip155:1/erc20:0xasset',
      symbol: 'ETH',
    },
  })),
}));

const mockUseRampAccountAddress = jest.fn(
  (_chainId?: unknown): string | null => MOCK_WALLET_ADDRESS,
);

jest.mock('./useRampAccountAddress', () => ({
  __esModule: true,
  default: (chainId: unknown) => mockUseRampAccountAddress(chainId),
}));

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
  I18nEvents: {
    addListener: jest.fn(),
  },
}));

const mockAddOrder = jest.fn();
const mockRefreshOrder = jest.fn();

jest.mock('./useRampsOrders', () => ({
  useRampsOrders: () => ({
    addOrder: mockAddOrder,
    refreshOrder: mockRefreshOrder,
    orders: [],
    getOrderById: jest.fn(),
    removeOrder: jest.fn(),
    getOrderFromCallback: jest.fn(),
  }),
}));

const MOCK_SELECTED_PROVIDER = {
  // Intentionally the production native id — UAT lists both variants, and
  // resolveNativeProviderCode must remap this to transak-native-staging.
  id: 'transak-native',
  name: 'Transak',
};

jest.mock('./useRampsProviders', () => ({
  useRampsProviders: () => ({
    providers: [MOCK_SELECTED_PROVIDER],
    selectedProvider: MOCK_SELECTED_PROVIDER,
    setSelectedProvider: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../utils/v2OrderToast', () => ({
  showV2OrderToast: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('./useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

const mockEmitTerminalOrderAnalyticsFromCallback = jest.fn();
jest.mock(
  '../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics',
  () => ({
    emitTerminalOrderAnalyticsFromCallback: (order: unknown) =>
      mockEmitTerminalOrderAnalyticsFromCallback(order),
  }),
);

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

jest.mock('./useRampsUserRegion', () => ({
  useRampsUserRegion: () => ({
    userRegion: mockUserRegion,
  }),
}));

jest.mock('./useRampsPaymentMethods', () => ({
  useRampsPaymentMethods: () => ({
    selectedPaymentMethod: mockSelectedPaymentMethod,
  }),
}));

const mockGetRampsEnvironment = jest.fn(() => 'STAGING');

jest.mock(
  '../../../../core/Engine/controllers/ramps-controller/ramps-service-init',
  () => ({
    getRampsEnvironment: () => mockGetRampsEnvironment(),
  }),
);

jest.mock('../../../../selectors/rampsController', () => ({
  selectTokens: jest.fn(),
}));

jest.mock('../utils/depositUtils', () => ({
  generateThemeParameters: jest.fn(() => ({ theme: 'light' })),
}));

let capturedHandleNavigationStateChange:
  | ((nav: { url: string }) => void)
  | null = null;

jest.mock('../Views/Checkout', () => ({
  createCheckoutNavDetails: jest.fn(
    ({
      url,
      providerName,
      onNavigationStateChange,
      headlessSessionId,
      workFlowRunId,
    }: {
      url: string;
      providerName: string;
      onNavigationStateChange?: (nav: { url: string }) => void;
      headlessSessionId?: string;
      workFlowRunId?: string;
    }) => {
      capturedHandleNavigationStateChange = onNavigationStateChange ?? null;
      return [
        'Checkout',
        {
          url,
          providerName,
          onNavigationStateChange,
          headlessSessionId,
          workFlowRunId,
        },
      ];
    },
  ),
}));

jest.mock('../Views/NativeFlow/KycWebview', () => ({
  createKycWebviewNavDetails: jest.fn(
    ({
      url,
      providerName,
      workFlowRunId,
      quote,
      amount,
    }: {
      url: string;
      providerName: string;
      workFlowRunId: string;
      quote: unknown;
      amount?: number;
    }) => [
      'RampKycWebview',
      { url, providerName, workFlowRunId, quote, amount },
    ],
  ),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/ramps-controller', () => ({
  RampsEnvironment: {
    Production: 'PRODUCTION',
    Staging: 'STAGING',
    Development: 'DEVELOPMENT',
  },
  TransakEnvironment: {
    Production: 'PRODUCTION',
    Staging: 'STAGING',
  },
  TransakOrderIdTransformer: {
    transakOrderIdToDepositOrderId: jest.fn(
      (orderId: string, _env: string) => `transformed-${orderId}`,
    ),
  },
  RampsOrderStatus: {
    Pending: 'PENDING',
    Completed: 'COMPLETED',
    Failed: 'FAILED',
    Cancelled: 'CANCELLED',
    IdExpired: 'ID_EXPIRED',
  },
}));

jest.mock('../constants', () => ({
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
    mockGetRampsEnvironment.mockReturnValue('STAGING');
    capturedHandleNavigationStateChange = null;
    // clearAllMocks resets call records but not return values set via
    // mockReturnValue, so explicitly default getSession back to "no session"
    // (matching the bare jest.fn() default) to stop per-test sessions leaking.
    (
      jest.requireMock('../headless/sessionRegistry').getSession as jest.Mock
    ).mockReturnValue(undefined);
    mockUserRegion = {
      country: { currency: 'USD', isoCode: 'US' },
      regionCode: 'us-ca',
    };
    mockSelectedPaymentMethod = {
      id: '/payments/debit-credit-card',
      isManualBankTransfer: false,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: mockQuote.fiatAmount },
            }),
            expect.objectContaining({
              name: 'RampBasicInfo',
              params: expect.objectContaining({ quote: mockQuote }),
            }),
          ],
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({ ramp_type: 'DEPOSIT' }),
      );
      // Non-headless stays DEPOSIT and carries no surface (TRAM-3623).
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({ ramp_type: 'HEADLESS' }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({ ramp_surface: undefined }),
      );
    });

    it('emits HEADLESS RAMPS_KYC_STARTED with ramp_surface when the session is headless (NOT_SUBMITTED)', async () => {
      const mockGetSession = jest.requireMock('../headless/sessionRegistry')
        .getSession as jest.Mock;
      mockGetSession.mockReturnValue({
        id: 'hs-kyc',
        params: { rampSurface: 'perps' },
        callbacks: {
          onOrderCreated: jest.fn(),
          onClose: jest.fn(),
          onError: jest.fn(),
        },
      });
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

      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'hs-kyc' },
        }),
      );

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'perps',
          kyc_type: 'SIMPLE',
          region: 'us-ca',
        }),
      );
    });

    it('merges baseRouteParams onto BasicInfo when KYC is NOT_SUBMITTED (headless)', async () => {
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

      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'headless-buy-abc' },
        }),
      );

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampHeadlessHost',
              params: { headlessSessionId: 'headless-buy-abc' },
            }),
            expect.objectContaining({
              name: 'RampBasicInfo',
              params: expect.objectContaining({
                quote: mockQuote,
                headlessSessionId: 'headless-buy-abc',
              }),
            }),
          ],
        }),
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
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockRequestOtt).toHaveBeenCalled();
      expect(mockGeneratePaymentWidgetUrl).toHaveBeenCalledWith(
        'test-ott',
        mockQuote,
        MOCK_WALLET_ADDRESS,
        { theme: 'light' },
      );
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: mockQuote.fiatAmount },
            }),
            expect.objectContaining({
              name: 'Checkout',
              params: expect.objectContaining({
                url: 'https://payment.example.com',
                providerName: 'Transak',
                onNavigationStateChange: expect.any(Function),
              }),
            }),
          ],
        }),
      );
    });

    it('resolves the wallet address from the headless session assetId, not the async-seeded selectedToken (TRAM-3598)', async () => {
      const mockGetSession = jest.requireMock('../headless/sessionRegistry')
        .getSession as jest.Mock;
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        params: { assetId: 'eip155:42161/slip44:60' },
        callbacks: {
          onOrderCreated: jest.fn(),
          onClose: jest.fn(),
          onError: jest.fn(),
        },
      });
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

      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'hs-1' },
        }),
      );
      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockUseRampAccountAddress).toHaveBeenCalledWith('eip155:42161');
      expect(mockGeneratePaymentWidgetUrl).toHaveBeenCalledWith(
        'test-ott',
        mockQuote,
        MOCK_WALLET_ADDRESS,
        { theme: 'light' },
      );
    });

    it('falls back to the selectedToken chain when there is no headless session', () => {
      const mockGetSession = jest.requireMock('../headless/sessionRegistry')
        .getSession as jest.Mock;
      mockGetSession.mockReturnValue(undefined);

      renderHook(() => useTransakRouting());

      expect(mockUseRampAccountAddress).toHaveBeenCalledWith('eip155:1');
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
        providerOrderId: 'order-123',
        walletAddress: '0xabc',
      });
      mockRefreshOrder.mockResolvedValue({
        providerOrderId: 'order-123',
        cryptoCurrency: { symbol: 'ETH' },
        cryptoAmount: '0.05',
        status: 'Pending',
      });

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockTransakCreateOrder).toHaveBeenCalledWith(
        'test-quote-id',
        MOCK_WALLET_ADDRESS,
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
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: mockQuote.fiatAmount },
            }),
            expect.objectContaining({
              name: 'RampKycProcessing',
            }),
          ],
        }),
      );
    });

    it('handles 401 error by logging out and navigating to enter email', async () => {
      const error = new Error('Unauthorized') as Error & {
        httpStatus: number;
      };
      error.httpStatus = 401;
      mockGetUserDetails.mockRejectedValue(error);
      mockLogoutFromProvider.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith('RampEnterEmail');
    });

    it('handles 401 in headless mode by passing amount, currency, and assetId to EnterEmail', async () => {
      const error = new Error('Unauthorized') as Error & {
        httpStatus: number;
      };
      error.httpStatus = 401;
      mockGetUserDetails.mockRejectedValue(error);
      mockLogoutFromProvider.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'headless-buy-reauth' },
        }),
      );

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampEnterEmail',
        expect.objectContaining({
          headlessSessionId: 'headless-buy-reauth',
          amount: '100',
          currency: 'USD',
          assetId: 'eip155:1/erc20:0xasset',
        }),
      );
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
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
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
        await result.current.routeAfterAuthentication(mockQuote as never, 25);
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: 25 },
            }),
            expect.objectContaining({
              name: 'RampAdditionalVerification',
              params: expect.objectContaining({
                quote: mockQuote,
                kycUrl: 'https://kyc.example.com',
                workFlowRunId: 'wf-123',
                amount: 25,
              }),
            }),
          ],
        }),
      );
      // Non-headless IDPROOF KYC_STARTED stays DEPOSIT (TRAM-3623).
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({ ramp_type: 'DEPOSIT', kyc_type: 'STANDARD' }),
      );
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({ ramp_type: 'HEADLESS' }),
      );
    });

    it('emits HEADLESS RAMPS_KYC_STARTED with ramp_surface for the IDPROOF path when headless', async () => {
      const mockGetSession = jest.requireMock('../headless/sessionRegistry')
        .getSession as jest.Mock;
      mockGetSession.mockReturnValue({
        id: 'hs-idproof',
        params: { rampSurface: 'prediction' },
        callbacks: {
          onOrderCreated: jest.fn(),
          onClose: jest.fn(),
          onError: jest.fn(),
        },
      });
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

      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'hs-idproof' },
        }),
      );

      await act(async () => {
        await result.current.routeAfterAuthentication(mockQuote as never, 25);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_STARTED',
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'prediction',
          kyc_type: 'STANDARD',
          region: 'us-ca',
        }),
      );
    });

    it('handles ADDITIONAL_FORMS_REQUIRED with IDPROOF when user amount is omitted', async () => {
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

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: undefined },
            }),
            expect.objectContaining({
              name: 'RampAdditionalVerification',
              params: expect.objectContaining({
                quote: mockQuote,
                kycUrl: 'https://kyc.example.com',
                workFlowRunId: 'wf-123',
                amount: undefined,
              }),
            }),
          ],
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
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('throws LimitExceededError when monthly limit is exceeded', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': 10000, '30': 50, '365': 200000 },
      });

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('throws LimitExceededError when yearly limit is exceeded', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': 10000, '30': 50000, '365': 50 },
      });

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('skips limit check when remaining is null', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({ remaining: null });
      mockRequestOtt.mockResolvedValue({ ott: 'test-ott' });
      mockGeneratePaymentWidgetUrl.mockReturnValue(
        'https://payment.example.com',
      );

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockRequestOtt).toHaveBeenCalled();
    });

    it('skips limit check when individual limits are undefined', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': undefined, '30': undefined, '365': undefined },
      });
      mockRequestOtt.mockResolvedValue({ ott: 'test-ott' });
      mockGeneratePaymentWidgetUrl.mockReturnValue(
        'https://payment.example.com',
      );

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockRequestOtt).toHaveBeenCalled();
    });

    it('throws error for unknown KYC status (default case)', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'UNKNOWN_STATUS',
        kycType: 'SIMPLE',
      });

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('throws when KYC requirements are null', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue(null);

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('navigates to KycProcessing for ADDITIONAL_FORMS_REQUIRED with no matching forms', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'ADDITIONAL_FORMS_REQUIRED',
        kycType: 'STANDARD',
      });
      mockGetAdditionalRequirements.mockResolvedValue({
        formsRequired: [{ type: 'SOME_UNKNOWN_FORM' }],
      });

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: mockQuote.fiatAmount },
            }),
            expect.objectContaining({
              name: 'RampKycProcessing',
            }),
          ],
        }),
      );
    });

    it('throws error when user details are missing and status is APPROVED', async () => {
      mockGetUserDetails.mockResolvedValue(null);
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('throws error when OTT request fails', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': 10000, '30': 50000, '365': 200000 },
      });
      mockRequestOtt.mockResolvedValue(null);

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('throws error when payment URL generation fails', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
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
      mockGeneratePaymentWidgetUrl.mockReturnValue(null);

      const { result } = renderHook(() => useTransakRouting());

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();
    });

    it('logs error and returns when getUserLimits throws a non-limit error', async () => {
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockRejectedValue(new Error('Network failure'));
      mockRequestOtt.mockResolvedValue({ ott: 'test-ott' });
      mockGeneratePaymentWidgetUrl.mockReturnValue(
        'https://payment.example.com',
      );

      const { result } = renderHook(() => useTransakRouting());

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(mockRequestOtt).toHaveBeenCalled();
    });

    it('routes getUserLimits infrastructure errors through failSession when headlessSessionId is set', async () => {
      const mockFailSession = jest.requireMock('../headless/sessionRegistry')
        .failSession as jest.Mock;
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      const networkError = new Error('Network failure');
      mockGetUserLimits.mockRejectedValue(networkError);
      mockRequestOtt.mockResolvedValue({ ott: 'test-ott' });
      mockGeneratePaymentWidgetUrl.mockReturnValue(
        'https://payment.example.com',
      );

      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'headless-buy-fixa' },
        }),
      );

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        } catch (e) {
          caught = e;
        }
      });
      expect(caught).toBeInstanceOf(Error);

      expect(mockFailSession).toHaveBeenCalledWith(
        'headless-buy-fixa',
        networkError,
      );
      expect(mockRequestOtt).not.toHaveBeenCalled();
    });

    it('does not call failSession when LimitExceededError fires in headless mode (early rethrow wins)', async () => {
      const mockFailSession = jest.requireMock('../headless/sessionRegistry')
        .failSession as jest.Mock;
      mockFailSession.mockReset();
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
        address: {},
      });
      mockGetKycRequirement.mockResolvedValue({
        status: 'APPROVED',
        kycType: 'SIMPLE',
      });
      mockGetUserLimits.mockResolvedValue({
        remaining: { '1': 0, '30': 50000, '365': 200000 },
      });

      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'headless-buy-fixa-limit' },
        }),
      );

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toThrow();

      expect(mockFailSession).not.toHaveBeenCalled();
    });
  });

  describe('navigateToVerifyIdentity', () => {
    it('resets navigation stack with BuildQuote base and verify identity on top', () => {
      const { result } = renderHook(() => useTransakRouting());

      act(() => {
        result.current.navigateToVerifyIdentity({
          quote: mockQuote as never,
          amount: 30,
        });
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: 30 },
            }),
            expect.objectContaining({
              name: 'RampVerifyIdentity',
              params: expect.objectContaining({ quote: mockQuote }),
            }),
          ],
        }),
      );
    });

    it('merges baseRouteParams onto VerifyIdentity so headlessSessionId survives the reset', () => {
      const { result } = renderHook(() =>
        useTransakRouting({
          baseRoute: 'RampHeadlessHost',
          baseRouteParams: { headlessSessionId: 'headless-buy-xyz' },
        }),
      );

      act(() => {
        result.current.navigateToVerifyIdentity({
          quote: mockQuote as never,
          amount: 30,
        });
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: [
            expect.objectContaining({
              name: 'RampHeadlessHost',
              params: { headlessSessionId: 'headless-buy-xyz' },
            }),
            expect.objectContaining({
              name: 'RampVerifyIdentity',
              params: expect.objectContaining({
                quote: mockQuote,
                headlessSessionId: 'headless-buy-xyz',
              }),
            }),
          ],
        }),
      );
    });
  });

  describe('navigateToKycWebview', () => {
    it('resets navigation stack with KycProcessing behind the webview', () => {
      const { result } = renderHook(() => useTransakRouting());
      const mockQuote = { id: 'quote-789' } as unknown as TransakBuyQuote;

      act(() => {
        result.current.navigateToKycWebview({
          quote: mockQuote,
          kycUrl: 'https://kyc.example.com',
          workFlowRunId: 'wf-456',
          amount: 30,
        });
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 2,
          routes: [
            expect.objectContaining({
              name: 'RampAmountInput',
              params: { amount: 30 },
            }),
            expect.objectContaining({
              name: 'RampKycProcessing',
            }),
            expect.objectContaining({
              name: 'RampKycWebview',
              params: expect.objectContaining({
                url: 'https://kyc.example.com',
                providerName: 'Transak',
                workFlowRunId: 'wf-456',
                quote: mockQuote,
                amount: 30,
              }),
            }),
          ],
        }),
      );
    });
  });

  describe('handleNavigationStateChange', () => {
    const runApprovedFlowToCaptureCallback = async () => {
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
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      return capturedHandleNavigationStateChange;
    };

    it('returns early when url does not start with REDIRECTION_URL', async () => {
      const handler = await runApprovedFlowToCaptureCallback();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({ url: 'https://other-site.com/path' });
      });

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
    });

    it('returns early when url has no orderId query param', async () => {
      const handler = await runApprovedFlowToCaptureCallback();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com/callback',
        });
      });

      expect(mockGetOrder).not.toHaveBeenCalled();
    });

    it('logs error and returns when URL parsing throws', async () => {
      const Logger = jest.requireMock('../../../../util/Logger');
      const mockLoggerError = Logger.error as jest.Mock;

      const parseThrowingUrl =
        'https://redirect.example.com?orderId=parse-error';
      const OriginalURL = global.URL;
      const urlSpy = jest
        .spyOn(global, 'URL')
        .mockImplementation((url: string | URL, base?: string | URL) => {
          const urlStr = typeof url === 'string' ? url : url.href;
          if (urlStr === parseThrowingUrl) {
            throw new TypeError('Invalid URL');
          }
          return new OriginalURL(url, base);
        });

      const handler = await runApprovedFlowToCaptureCallback();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({ url: parseThrowingUrl });
      });

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        'useTransakRouting: Error parsing redirect URL',
      );
      expect(mockGetOrder).not.toHaveBeenCalled();

      urlSpy.mockRestore();
    });

    it('skips processing when orderId matches processingOrderIdRef', async () => {
      const handler = await runApprovedFlowToCaptureCallback();
      expect(handler).not.toBeNull();
      if (!handler) return;

      const url = 'https://redirect.example.com?orderId=order-123';

      await act(async () => {
        await handler({ url });
      });

      await act(async () => {
        await handler({ url });
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          routes: [
            expect.objectContaining({
              name: 'RampsOrderDetails',
              params: expect.objectContaining({
                callbackUrl: url,
                providerCode: 'transak-native-staging',
                walletAddress: MOCK_WALLET_ADDRESS,
                showCloseButton: true,
                cryptocurrency: 'ETH',
              }),
            }),
          ],
        }),
      );
      expect(mockGetOrder).not.toHaveBeenCalled();

      mockReset.mockClear();

      await act(async () => {
        await handler({ url });
      });

      expect(mockReset).not.toHaveBeenCalled();
      expect(mockGetOrder).not.toHaveBeenCalled();
    });

    it('navigates to order details with callback params without fetching in the hook', async () => {
      const handler = await runApprovedFlowToCaptureCallback();
      expect(handler).not.toBeNull();
      if (!handler) return;

      const callbackUrl = 'https://redirect.example.com?orderId=order-123';

      await act(async () => {
        await handler({
          url: callbackUrl,
        });
      });

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(mockRefreshOrder).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          routes: [
            expect.objectContaining({
              name: 'RampsOrderDetails',
              params: expect.objectContaining({
                callbackUrl,
                providerCode: 'transak-native-staging',
                walletAddress: MOCK_WALLET_ADDRESS,
                showCloseButton: true,
                cryptocurrency: 'ETH',
              }),
            }),
          ],
        }),
      );
    });
  });

  describe('headless session flow', () => {
    const mockGetSession = jest.requireMock('../headless/sessionRegistry')
      .getSession as jest.Mock;
    const mockCloseSession = jest.requireMock('../headless/sessionRegistry')
      .closeSession as jest.Mock;
    const mockFailSession = jest.requireMock('../headless/sessionRegistry')
      .failSession as jest.Mock;
    const mockShowV2OrderToast = jest.requireMock('../utils/v2OrderToast')
      .showV2OrderToast as jest.Mock;

    const HEADLESS_CONFIG = {
      baseRoute: 'RampHeadlessHost',
      baseRouteParams: { headlessSessionId: 'hs-1' },
    };

    const depositOrder = {
      id: 'order-hs',
      providerOrderId: 'order-hs',
      provider: 'transak-native',
      walletAddress: MOCK_WALLET_ADDRESS,
      paymentDetails: {},
    };

    const refreshedOrder = {
      providerOrderId: 'order-hs',
      cryptoCurrency: { symbol: 'ETH' },
      cryptoAmount: '0.05',
      status: 'Pending',
      fiatAmount: 100,
      exchangeRate: 2000,
      networkFees: 0,
      partnerFees: 0,
      totalFeesFiat: 0,
      paymentMethod: { id: 'card' },
      network: { chainId: '1', name: 'Ethereum' },
      fiatCurrency: { symbol: 'USD' },
    };

    const runApprovedFlowHeadless = async () => {
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

      const { result } = renderHook(() => useTransakRouting(HEADLESS_CONFIG));

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      return capturedHandleNavigationStateChange;
    };

    beforeEach(() => {
      mockGetSession.mockReset();
      mockCloseSession.mockReset();
      mockFailSession.mockReset();
      mockParentPop.mockReset();
      mockGetOrder.mockResolvedValue(depositOrder);
      mockRefreshOrder.mockResolvedValue(refreshedOrder);
    });

    it('fires onOrderCreated, closes the session, and pops the ramp stack when a live session is present', async () => {
      const onOrderCreated = jest.fn();
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated,
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(onOrderCreated).toHaveBeenCalledWith('order-hs');
      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'completed',
      });
      expect(mockParentPop).toHaveBeenCalled();
      expect(mockAddOrder).toHaveBeenCalledWith(
        expect.objectContaining({ providerOrderId: 'order-hs' }),
      );
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: expect.arrayContaining([
            expect.objectContaining({
              name: 'Checkout',
              params: expect.objectContaining({ headlessSessionId: 'hs-1' }),
            }),
          ]),
        }),
      );
      // Headless webview-redirect terminal event is flipped to HEADLESS and
      // carries region (TRAM-3623 §4/§5); the session mock has no params so
      // ramp_surface is undefined here.
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_TRANSACTION_CONFIRMED',
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          region: 'us-ca',
          provider_order_id: 'order-hs',
        }),
      );
      expect(mockReset).not.toHaveBeenCalledWith(
        expect.objectContaining({
          routes: [expect.objectContaining({ name: 'RampsOrderDetails' })],
        }),
      );
      expect(mockShowV2OrderToast).not.toHaveBeenCalled();
    });

    it('falls back to the staging native provider code when the order has no provider', async () => {
      mockGetOrder.mockResolvedValue({ ...depositOrder, provider: undefined });
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(mockRefreshOrder).toHaveBeenCalledWith(
        'transak-native-staging',
        'order-hs',
        MOCK_WALLET_ADDRESS,
      );
    });

    it('remaps a production native provider on the order to the staging code', async () => {
      mockGetOrder.mockResolvedValue({
        ...depositOrder,
        provider: '/providers/transak-native',
      });
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(mockRefreshOrder).toHaveBeenCalledWith(
        'transak-native-staging',
        'order-hs',
        MOCK_WALLET_ADDRESS,
      );
    });

    it('uses the staging native provider code when ramps env is Development', async () => {
      mockGetRampsEnvironment.mockReturnValue('DEVELOPMENT');
      mockGetOrder.mockResolvedValue({
        ...depositOrder,
        provider: '/providers/transak-native',
      });
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(mockRefreshOrder).toHaveBeenCalledWith(
        'transak-native-staging',
        'order-hs',
        MOCK_WALLET_ADDRESS,
      );
    });

    it('carries ramp_surface from the live session on the HEADLESS terminal event', async () => {
      const onOrderCreated = jest.fn();
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: { rampSurface: 'money_account' },
        callbacks: {
          onOrderCreated,
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_TRANSACTION_CONFIRMED',
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region: 'us-ca',
          provider_order_id: 'order-hs',
        }),
      );
      // Writes the headless context for the terminal-failed subscriber
      // (TRAM-3623 §2), keyed by the same providerOrderId.
      expect(mockSetHeadlessOrderContext).toHaveBeenCalledWith('order-hs', {
        rampSurface: 'money_account',
        region: 'us-ca',
      });
    });

    it('does NOT emit RAMPS_TRANSACTION_CONFIRMED for a terminal-failed order; emits the terminal failure instead (TRAM-3691)', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: { rampSurface: 'money_account' },
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      // Widget payment failed: refreshOrder returns a terminal-failed order.
      mockRefreshOrder.mockResolvedValue({
        ...refreshedOrder,
        status: RampsOrderStatus.Failed,
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        'RAMPS_TRANSACTION_CONFIRMED',
        expect.anything(),
      );
      expect(mockEmitTerminalOrderAnalyticsFromCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: RampsOrderStatus.Failed }),
      );
    });

    it('swallows consumer onOrderCreated errors and still closes + pops', async () => {
      const Logger = jest.requireMock('../../../../util/Logger');
      const mockLoggerError = Logger.error as jest.Mock;
      const throwingCallback = jest.fn(() => {
        throw new Error('consumer bug');
      });
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: throwingCallback,
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(throwingCallback).toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        'useTransakRouting: onOrderCreated callback threw',
      );
      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'completed',
      });
      expect(mockParentPop).toHaveBeenCalled();
    });

    it('preserves LIMIT_EXCEEDED errors for the Headless Host to surface as data', async () => {
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

      const { result } = renderHook(() => useTransakRouting(HEADLESS_CONFIG));

      await expect(
        act(async () => {
          await result.current.routeAfterAuthentication(
            mockQuote as never,
            mockQuote.fiatAmount,
          );
        }),
      ).rejects.toMatchObject({
        name: 'LimitExceededError',
        headlessBuyErrorCode: 'LIMIT_EXCEEDED',
      });

      expect(mockShowV2OrderToast).not.toHaveBeenCalled();
      expect(mockFailSession).not.toHaveBeenCalled();
    });

    it('surfaces headless checkout processing failures through onError and skips toasts', async () => {
      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockGetOrder.mockRejectedValue(new Error('Network error'));
      mockFailSession.mockReturnValue({
        code: 'UNKNOWN',
        message: 'Network error',
      });

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(mockFailSession).toHaveBeenCalledWith('hs-1', expect.any(Error));
      expect(mockShowV2OrderToast).not.toHaveBeenCalled();
      expect(mockParentPop).toHaveBeenCalled();
    });

    it('emits a HEADLESS RAMPS_ORDER_FAILED when a headless checkout processing failure occurs (TRAM-3623 §7)', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: { rampSurface: 'money_account', amount: 100 },
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockFailSession.mockReturnValue({ code: 'UNKNOWN', message: 'boom' });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      mockGetOrder.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_ORDER_FAILED',
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region: 'us-ca',
          error_message: expect.any(String),
          // orderId from the callback URL is the provider order id (TRAM-3696).
          provider_order_id: 'order-hs',
        }),
      );
    });

    it('treats a Transak redirect without orderId as user dismissal when headless', async () => {
      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com/callback',
        });
      });

      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'user_dismissed',
      });
      expect(mockParentPop).toHaveBeenCalled();
      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(mockShowV2OrderToast).not.toHaveBeenCalled();
    });

    it('routes manual bank transfer order success through headless callbacks without showing a toast', async () => {
      const onOrderCreated = jest.fn();
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: { rampSurface: 'money_account' },
        callbacks: {
          onOrderCreated,
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockSelectedPaymentMethod = {
        id: '/payments/bank-transfer',
        isManualBankTransfer: true,
      };
      mockGetUserDetails.mockResolvedValue({
        firstName: 'John',
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
        id: 'order-bank-1',
        providerOrderId: 'order-bank-1',
        provider: 'transak-native',
        walletAddress: MOCK_WALLET_ADDRESS,
        paymentDetails: { accountNumber: '12345' },
      });
      mockRefreshOrder.mockResolvedValue({
        ...refreshedOrder,
        providerOrderId: 'order-bank-1',
      });

      const { result } = renderHook(() => useTransakRouting(HEADLESS_CONFIG));

      await act(async () => {
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });

      expect(onOrderCreated).toHaveBeenCalledWith('order-bank-1');
      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'completed',
      });
      expect(mockParentPop).toHaveBeenCalled();
      // Manual-bank headless branch now fires a HEADLESS terminal confirmed
      // event (TRAM-3623 §4) that previously did not exist.
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_TRANSACTION_CONFIRMED',
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region: 'us-ca',
          provider_order_id: 'order-bank-1',
        }),
      );
      // Manual-bank headless branch also writes the terminal-failed context
      // (TRAM-3623 §2), keyed by the same providerOrderId.
      expect(mockSetHeadlessOrderContext).toHaveBeenCalledWith('order-bank-1', {
        rampSurface: 'money_account',
        region: 'us-ca',
      });
      // ...and the order toast stays suppressed on the headless path.
      expect(mockShowV2OrderToast).not.toHaveBeenCalled();
    });

    it('falls back to OrderDetails callback-resolution when session id is present but session is missing from registry', async () => {
      mockGetSession.mockReturnValue(undefined);

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      const callbackUrl = 'https://redirect.example.com?orderId=order-hs';

      await act(async () => {
        await handler({ url: callbackUrl });
      });

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          routes: [
            expect.objectContaining({
              name: 'RampsOrderDetails',
              params: expect.objectContaining({
                callbackUrl,
                providerCode: 'transak-native-staging',
                walletAddress: MOCK_WALLET_ADDRESS,
                showCloseButton: true,
                cryptocurrency: 'ETH',
              }),
            }),
          ],
        }),
      );
      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(mockRefreshOrder).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
      expect(mockShowV2OrderToast).not.toHaveBeenCalled();
      expect(mockCloseSession).not.toHaveBeenCalled();
      expect(mockParentPop).not.toHaveBeenCalled();
      // CRITICAL guard (TRAM-3623 §2): the write is headless-gated, so a
      // session-less (non-headless UB2-native) order must NOT seed the
      // registry - otherwise it would wrongly emit a HEADLESS terminal-failed.
      expect(mockSetHeadlessOrderContext).not.toHaveBeenCalled();
    });

    it('does not write the headless context for a non-headless webview success (no session)', async () => {
      // No headless session: useTransakRouting() with no config, getSession
      // returns undefined (the suite default).
      mockGetSession.mockReturnValue(undefined);
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
        await result.current.routeAfterAuthentication(
          mockQuote as never,
          mockQuote.fiatAmount,
        );
      });
      const handler = capturedHandleNavigationStateChange;
      expect(handler).not.toBeNull();
      if (!handler) return;

      mockGetOrder.mockResolvedValue({
        id: 'order-123',
        providerOrderId: 'order-123',
        provider: 'transak-native',
        walletAddress: MOCK_WALLET_ADDRESS,
        paymentDetails: {},
      });
      mockRefreshOrder.mockResolvedValue({
        providerOrderId: 'order-123',
        cryptoCurrency: { symbol: 'ETH' },
        cryptoAmount: '0.05',
        status: 'Pending',
        fiatAmount: 100,
        exchangeRate: 2000,
        networkFees: 0,
        partnerFees: 0,
        totalFeesFiat: 0,
        paymentMethod: { id: 'card' },
        network: { chainId: '1', name: 'Ethereum' },
        fiatCurrency: { symbol: 'USD' },
      });

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-123',
        });
      });

      // Non-headless (UB2-native) webview success: main routes it to
      // RAMPS_ORDER_DETAILS, so the inline confirmed event and the headless
      // context write (both headless-only) do not fire here.
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        'RAMPS_TRANSACTION_CONFIRMED',
        expect.anything(),
      );
      expect(mockSetHeadlessOrderContext).not.toHaveBeenCalled();
    });

    it('key-parity: the providerOrderId written by the headless CONFIRMED block matches what the subscriber receives for the same order', async () => {
      const onOrderCreated = jest.fn();
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: { rampSurface: 'money_account' },
        callbacks: {
          onOrderCreated,
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });

      const handler = await runApprovedFlowHeadless();
      expect(handler).not.toBeNull();
      if (!handler) return;

      await act(async () => {
        await handler({
          url: 'https://redirect.example.com?orderId=order-hs',
        });
      });

      // The hook writes the context keyed by the order it just created/refreshed.
      expect(mockSetHeadlessOrderContext).toHaveBeenCalledTimes(1);
      const writtenOrderId = mockSetHeadlessOrderContext.mock.calls[0][0];

      // The controller-side subscriber receives this same order under the same
      // providerOrderId (the refreshed order's id). extractOrderCode is applied
      // on both the registry write and read, so the keys resolve identically -
      // proving the lookup actually matches in production, not just in synthetic
      // tests. refreshedOrder.providerOrderId is 'order-hs'.
      expect(writtenOrderId).toBe('order-hs');
      expect(extractOrderCode(writtenOrderId)).toBe(
        extractOrderCode(refreshedOrder.providerOrderId),
      );
    });
  });
});
