import { renderHook, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { useContinueWithQuote } from './useContinueWithQuote';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useRampsController', () => ({
  useRampsController: jest.fn(),
}));

jest.mock('./useTransakController', () => ({
  useTransakController: jest.fn(),
}));

jest.mock('./useTransakRouting', () => ({
  useTransakRouting: jest.fn(),
}));

jest.mock('./useRampAccountAddress', () => ({
  __esModule: true,
  default: jest.fn(() => '0x1234567890123456789012345678901234567890'),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  selectHasAgreedTransakNativePolicy: jest.fn(() => false),
}));

jest.mock('../../../../util/device', () => {
  const mockIsAndroid = jest.fn(() => false);
  return {
    __esModule: true,
    default: {
      isAndroid: mockIsAndroid,
      isIos: jest.fn(() => true),
    },
    isAndroid: mockIsAndroid,
    isIos: jest.fn(() => true),
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    openAuth: jest.fn(),
    closeAuth: jest.fn(),
    isAvailable: jest.fn(),
  },
  openAuth: jest.fn(),
  closeAuth: jest.fn(),
  isAvailable: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

jest.mock('../utils/reportRampsError', () => ({
  reportRampsError: jest.fn(
    (_error: unknown, _ctx: unknown, fallback: string) => fallback,
  ),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails:
    (name: string, screen?: string) => (params?: object) => [
      name,
      screen ? { screen, params } : params,
    ],
}));

const mockUseRampsController = jest.requireMock('./useRampsController')
  .useRampsController as jest.Mock;
const mockUseTransakController = jest.requireMock('./useTransakController')
  .useTransakController as jest.Mock;
const mockUseTransakRouting = jest.requireMock('./useTransakRouting')
  .useTransakRouting as jest.Mock;
const mockFiatOrdersModule = jest.requireMock(
  '../../../../reducers/fiatOrders',
) as {
  selectHasAgreedTransakNativePolicy: jest.Mock;
};
const mockDeviceIsAndroid = jest.requireMock('../../../../util/device')
  .isAndroid as jest.Mock;
const mockLinkingOpenURL = jest.requireMock(
  'react-native/Libraries/Linking/Linking',
).openURL as jest.Mock;
const mockInAppBrowser = jest.requireMock('react-native-inappbrowser-reborn')
  .default as {
  openAuth: jest.Mock;
  closeAuth: jest.Mock;
  isAvailable: jest.Mock;
};
const mockReportRampsError = jest.requireMock('../utils/reportRampsError')
  .reportRampsError as jest.Mock;

const mockNavigate = jest.fn();
const mockNavigationReset = jest.fn();
const mockGetBuyWidgetData = jest.fn();
const mockAddPrecreatedOrder = jest.fn();
const mockCheckExistingToken = jest.fn();
const mockGetBuyQuote = jest.fn();
const mockRouteAfterAuth = jest.fn();

const SELECTED_TOKEN = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
};

const SELECTED_PAYMENT_METHOD = {
  id: '/payments/debit-credit-card',
  name: 'Debit/Credit Card',
};

const WIDGET_PROVIDER = {
  id: 'moonpay',
  name: 'MoonPay',
};

const NATIVE_PROVIDER = {
  id: 'transak',
  name: 'Transak',
};

const USER_REGION = {
  country: { currency: 'USD' },
  regionCode: 'us-ca',
};

const WIDGET_PROVIDER_QUOTE = {
  provider: 'moonpay',
  id: 'quote-1',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
  quote: {
    buyWidget: { browser: 'IN_APP_OS_BROWSER' as const },
    buyURL: 'https://widget.example.com/checkout',
  },
} as const;

const IN_APP_CHECKOUT_QUOTE = {
  provider: 'moonpay',
  id: 'quote-inapp-1',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
  quote: {
    buyURL: 'https://widget.example.com/checkout',
  },
} as const;

const NATIVE_PROVIDER_QUOTE = {
  provider: 'transak',
  id: 'quote-transak-1',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
  providerInfo: { type: 'native' as const, name: 'Transak', id: 'transak' },
} as const;

const MOCK_TRANSAK_QUOTE = {
  id: 'transak-quote-1',
  fiatAmount: 100,
  fiatCurrency: 'USD',
  cryptoAmount: '0.05',
  cryptoCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
};

const CTX = { amount: 100, assetId: 'eip155:1/slip44:60' };

type ControllerOverrides = Partial<{
  userRegion: typeof USER_REGION | null;
  selectedProvider: typeof WIDGET_PROVIDER | typeof NATIVE_PROVIDER | null;
  selectedToken: typeof SELECTED_TOKEN | null;
  selectedPaymentMethod: typeof SELECTED_PAYMENT_METHOD | null;
}>;

const buildController = (overrides: ControllerOverrides = {}) => ({
  userRegion: USER_REGION,
  selectedProvider: WIDGET_PROVIDER,
  selectedToken: SELECTED_TOKEN,
  selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
  getBuyWidgetData: mockGetBuyWidgetData,
  addPrecreatedOrder: mockAddPrecreatedOrder,
  ...overrides,
});

async function invoke(
  result: ReturnType<
    typeof renderHook<ReturnType<typeof useContinueWithQuote>, unknown>
  >['result'],
  quote: unknown,
  ctx: { amount: number; assetId: string } = CTX,
): Promise<Error | undefined> {
  let caught: Error | undefined;
  await act(async () => {
    try {
      await result.current.continueWithQuote(
        quote as Parameters<typeof result.current.continueWithQuote>[0],
        ctx,
      );
    } catch (e) {
      caught = e as Error;
    }
  });
  return caught;
}

describe('useContinueWithQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiatOrdersModule.selectHasAgreedTransakNativePolicy.mockReturnValue(
      false,
    );
    mockUseRampsController.mockReturnValue(buildController());
    mockUseTransakController.mockReturnValue({
      checkExistingToken: mockCheckExistingToken,
      getBuyQuote: mockGetBuyQuote,
    });
    mockUseTransakRouting.mockReturnValue({
      routeAfterAuthentication: mockRouteAfterAuth,
    });
    mockReportRampsError.mockImplementation(
      (_error, _ctx, fallback: string) => fallback,
    );
    (useNavigation as jest.Mock).mockReturnValue({
      reset: mockNavigationReset,
      navigate: mockNavigate,
      setParams: jest.fn(),
      goBack: jest.fn(),
    });
    (useSelector as jest.Mock).mockImplementation((selector) =>
      typeof selector === 'function' ? selector() : undefined,
    );
  });

  describe('continueWithQuote: native provider', () => {
    beforeEach(() => {
      mockUseRampsController.mockReturnValue(
        buildController({ selectedProvider: NATIVE_PROVIDER }),
      );
    });

    it('routes after auth when user has token', async () => {
      mockCheckExistingToken.mockResolvedValue(true);
      mockGetBuyQuote.mockResolvedValue(MOCK_TRANSAK_QUOTE);
      mockRouteAfterAuth.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE);

      expect(caught).toBeUndefined();
      expect(mockCheckExistingToken).toHaveBeenCalled();
      expect(mockGetBuyQuote).toHaveBeenCalledWith(
        'USD',
        'eip155:1/slip44:60',
        'eip155:1',
        '/payments/debit-credit-card',
        '100',
      );
      expect(mockRouteAfterAuth).toHaveBeenCalledWith(MOCK_TRANSAK_QUOTE, 100);
    });

    it('navigates to VerifyIdentity when user has no token and policy not agreed', async () => {
      mockCheckExistingToken.mockResolvedValue(false);

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE);

      expect(caught).toBeUndefined();
      expect(mockCheckExistingToken).toHaveBeenCalled();
      expect(mockGetBuyQuote).not.toHaveBeenCalled();
      expect(mockRouteAfterAuth).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.RAMP.VERIFY_IDENTITY,
        expect.objectContaining({
          amount: '100',
          currency: 'USD',
          assetId: 'eip155:1/slip44:60',
        }),
      );
    });

    it('navigates to EnterEmail when user has no token and policy agreed', async () => {
      mockCheckExistingToken.mockResolvedValue(false);
      mockFiatOrdersModule.selectHasAgreedTransakNativePolicy.mockReturnValue(
        true,
      );

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE);

      expect(caught).toBeUndefined();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.RAMP.ENTER_EMAIL,
        expect.objectContaining({
          amount: '100',
          currency: 'USD',
          assetId: 'eip155:1/slip44:60',
        }),
      );
    });

    it('throws when transakGetBuyQuote returns null', async () => {
      mockCheckExistingToken.mockResolvedValue(true);
      mockGetBuyQuote.mockResolvedValue(null);

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE);

      expect(caught).toBeInstanceOf(Error);
      expect(mockRouteAfterAuth).not.toHaveBeenCalled();
      expect(mockReportRampsError).toHaveBeenCalledWith(
        expect.any(Error),
        { message: 'Failed to route native provider flow' },
        'deposit.buildQuote.unexpectedError',
      );
    });

    it('throws when checkExistingToken rejects', async () => {
      mockCheckExistingToken.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE);

      expect(caught).toBeInstanceOf(Error);
      expect(mockGetBuyQuote).not.toHaveBeenCalled();
      expect(mockReportRampsError).toHaveBeenCalled();
    });

    it('throws when routeAfterAuthentication rejects', async () => {
      mockCheckExistingToken.mockResolvedValue(true);
      mockGetBuyQuote.mockResolvedValue(MOCK_TRANSAK_QUOTE);
      mockRouteAfterAuth.mockRejectedValue(new Error('Routing failed'));

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE);

      expect(caught).toBeInstanceOf(Error);
      expect(mockReportRampsError).toHaveBeenCalledWith(
        expect.any(Error),
        { message: 'Failed to route native provider flow' },
        'deposit.buildQuote.unexpectedError',
      );
    });
  });

  describe('continueWithQuote: widget provider', () => {
    it('navigates to Checkout when useExternalBrowser is false (in-app widget)', async () => {
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://checkout.example.com/embed',
        orderId: 'ord-456',
      });

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, IN_APP_CHECKOUT_QUOTE);

      expect(caught).toBeUndefined();
      expect(mockGetBuyWidgetData).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
      const navigateArgs = JSON.stringify(mockNavigate.mock.calls);
      expect(navigateArgs).toContain('https://checkout.example.com/embed');
      expect(navigateArgs).toContain('MoonPay');
    });

    it('throws when getBuyWidgetData returns no URL', async () => {
      mockGetBuyWidgetData.mockResolvedValue({});

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, WIDGET_PROVIDER_QUOTE);

      expect(caught).toBeInstanceOf(Error);
      expect(mockGetBuyWidgetData).toHaveBeenCalled();
      expect(mockReportRampsError).toHaveBeenCalledWith(
        expect.any(Error),
        { provider: 'moonpay' },
        'deposit.buildQuote.unexpectedError',
      );
      // The "Failed to fetch widget URL" path MUST NOT be reported for the
      // null-URL branch — it has its own, more specific context.
      expect(mockReportRampsError).toHaveBeenCalledTimes(1);
    });

    it('throws when getBuyWidgetData rejects', async () => {
      mockGetBuyWidgetData.mockRejectedValue(
        new Error('Network request failed'),
      );

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, WIDGET_PROVIDER_QUOTE);

      expect(caught).toBeInstanceOf(Error);
      expect(mockReportRampsError).toHaveBeenCalledWith(
        expect.any(Error),
        { provider: 'moonpay', message: 'Failed to fetch widget URL' },
        'deposit.buildQuote.unexpectedError',
      );
    });
  });

  describe('navigateAfterExternalBrowser (widget external-browser paths)', () => {
    it('resets to BuildQuote on Android external-browser path', async () => {
      mockDeviceIsAndroid.mockReturnValue(true);
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://widget.example.com/checkout',
        browser: 'IN_APP_OS_BROWSER',
      });

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, WIDGET_PROVIDER_QUOTE);

      expect(caught).toBeUndefined();
      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        'https://widget.example.com/checkout',
      );
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.RAMP.BUILD_QUOTE, params: {} }],
      });
    });

    it('resets to order details after InAppBrowser success', async () => {
      mockDeviceIsAndroid.mockReturnValue(false);
      mockInAppBrowser.isAvailable.mockResolvedValue(true);
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/moonpay?orderId=ord-123',
      });
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://widget.example.com/checkout',
        browser: 'IN_APP_OS_BROWSER',
        orderId: 'ord-123',
      });

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, WIDGET_PROVIDER_QUOTE);

      expect(caught).toBeUndefined();
      expect(mockInAppBrowser.closeAuth).toHaveBeenCalled();
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.RAMP.RAMPS_ORDER_DETAILS,
            params: {
              callbackUrl:
                'metamask://on-ramp/providers/moonpay?orderId=ord-123',
              providerCode: 'moonpay',
              walletAddress: '0x1234567890123456789012345678901234567890',
              showCloseButton: true,
            },
          },
        ],
      });
    });

    it('resets to BuildQuote when InAppBrowser auth is cancelled', async () => {
      mockDeviceIsAndroid.mockReturnValue(false);
      mockInAppBrowser.isAvailable.mockResolvedValue(true);
      mockInAppBrowser.openAuth.mockResolvedValue({ type: 'cancel' });
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://widget.example.com/checkout',
        browser: 'IN_APP_OS_BROWSER',
      });

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, WIDGET_PROVIDER_QUOTE);

      expect(caught).toBeUndefined();
      expect(mockInAppBrowser.closeAuth).toHaveBeenCalled();
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.RAMP.BUILD_QUOTE, params: {} }],
      });
    });
  });

  describe('context overrides (headless-ready)', () => {
    // These tests prove that callers without controller-seeded state (the
    // headless flow's Host) can drive `continueWithQuote` end-to-end by
    // passing every controller-coupled value through `ctx`. BuildQuote
    // continues to omit overrides and falls back to controller selections —
    // see the suites above.
    const HEADLESS_CTX = {
      amount: 250,
      assetId: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      chainId: 'eip155:59144' as const,
      walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      currency: 'EUR',
      cryptoSymbol: 'mUSD',
      paymentMethodId: '/payments/sepa-bank-transfer',
      providerName: 'Headless Provider',
    };

    it('routes native quote using only ctx overrides when controller has no selections', async () => {
      mockUseRampsController.mockReturnValue(
        buildController({
          selectedToken: null,
          selectedProvider: null,
          selectedPaymentMethod: null,
          userRegion: null,
        }),
      );
      mockCheckExistingToken.mockResolvedValue(true);
      mockGetBuyQuote.mockResolvedValue(MOCK_TRANSAK_QUOTE);
      mockRouteAfterAuth.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE, HEADLESS_CTX);

      expect(caught).toBeUndefined();
      expect(mockGetBuyQuote).toHaveBeenCalledWith(
        'EUR',
        HEADLESS_CTX.assetId,
        'eip155:59144',
        '/payments/sepa-bank-transfer',
        '250',
      );
      expect(mockRouteAfterAuth).toHaveBeenCalledWith(MOCK_TRANSAK_QUOTE, 250);
    });

    it('navigates EnterEmail with override currency when controller userRegion is missing', async () => {
      mockUseRampsController.mockReturnValue(
        buildController({
          selectedToken: null,
          selectedProvider: null,
          selectedPaymentMethod: null,
          userRegion: null,
        }),
      );
      mockCheckExistingToken.mockResolvedValue(false);
      mockFiatOrdersModule.selectHasAgreedTransakNativePolicy.mockReturnValue(
        true,
      );

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE, HEADLESS_CTX);

      expect(caught).toBeUndefined();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.RAMP.ENTER_EMAIL,
        expect.objectContaining({
          amount: '250',
          currency: 'EUR',
          assetId: HEADLESS_CTX.assetId,
        }),
      );
    });

    it('routes widget quote using ctx overrides for currency, walletAddress, providerName and chainId', async () => {
      mockUseRampsController.mockReturnValue(
        buildController({
          selectedToken: null,
          selectedProvider: null,
          selectedPaymentMethod: null,
          userRegion: null,
        }),
      );
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://checkout.example.com/headless',
        orderId: 'ord-headless-1',
      });

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, IN_APP_CHECKOUT_QUOTE, HEADLESS_CTX);

      expect(caught).toBeUndefined();
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const [, navigateParams] = mockNavigate.mock.calls[0];
      expect(navigateParams).toEqual(
        expect.objectContaining({
          url: 'https://checkout.example.com/headless',
          providerName: 'Headless Provider',
          currency: 'EUR',
          cryptocurrency: 'mUSD',
          walletAddress: HEADLESS_CTX.walletAddress,
          // network is the part after the colon in chainId.
          network: '59144',
        }),
      );
    });

    it('preserves controller fallback when overrides are omitted', async () => {
      // Sanity check: a BuildQuote-style call (no ctx overrides) keeps using
      // controller selections — proves Phase 4c is purely additive.
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://checkout.example.com/embed',
        orderId: 'ord-789',
      });

      const { result } = renderHook(() => useContinueWithQuote());

      await invoke(result, IN_APP_CHECKOUT_QUOTE);

      const [, navigateParams] = mockNavigate.mock.calls[0];
      expect(navigateParams).toEqual(
        expect.objectContaining({
          providerName: 'MoonPay',
          currency: 'USD',
          cryptocurrency: 'ETH',
          // chainId from controller selectedToken is `eip155:1`, so network is `1`.
          network: '1',
        }),
      );
    });
  });

  describe('error contract', () => {
    it('thrown Error message matches the user-facing string returned by reportRampsError', async () => {
      mockReportRampsError.mockReturnValue('Friendly user message');
      mockGetBuyWidgetData.mockRejectedValue(new Error('low-level failure'));

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, WIDGET_PROVIDER_QUOTE);

      expect(caught).toBeInstanceOf(Error);
      expect(caught?.message).toBe('Friendly user message');
    });

    it('reports the error exactly once per failure (no double-logging)', async () => {
      mockGetBuyWidgetData.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => useContinueWithQuote());

      await invoke(result, WIDGET_PROVIDER_QUOTE);

      expect(mockReportRampsError).toHaveBeenCalledTimes(1);
    });
  });
});
