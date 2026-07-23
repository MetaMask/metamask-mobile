import { renderHook, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  __resetSessionRegistryForTests,
  createSession,
  getSession,
} from '../headless/sessionRegistry';
import type { HeadlessBuyParams } from '../headless/types';
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

jest.mock('../headless/externalBrowserReturn', () => ({
  clearExternalReturnCorrelation: jest.fn(),
  completeHeadlessExternalReturn: jest.fn(),
  emitExternalCheckoutClosed: jest.fn(),
  emitExternalOrderFailed: jest.fn(),
  getExternalReturnCorrelation: jest.fn(() => null),
  recordExternalReturnCorrelation: jest.fn(),
}));

jest.mock('../headless/headlessEntryNavigation', () => ({
  dismissHeadlessFlow: jest.fn(),
}));

jest.mock(
  '../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
  () => ({
    setHeadlessOrderContext: jest.fn(),
  }),
);

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
).default.openURL as jest.Mock;
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
  ctx: {
    amount: number;
    assetId: string;
    headlessSessionId?: string;
    walletAddress?: string;
    redirectUrl?: string;
  } = CTX,
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

    it('throws before fetching the quote when no payment method resolves (headless)', async () => {
      mockUseRampsController.mockReturnValue(
        buildController({
          selectedProvider: NATIVE_PROVIDER,
          selectedPaymentMethod: null,
        }),
      );
      mockCheckExistingToken.mockResolvedValue(true);

      const { result } = renderHook(() => useContinueWithQuote());

      // The missing-payment-method guard is scoped to the headless flow, so
      // it only fires when `ctx.headlessSessionId` is set.
      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE, {
        ...CTX,
        headlessSessionId: 'session-1',
      });

      expect(caught).toBeInstanceOf(Error);
      expect(mockCheckExistingToken).not.toHaveBeenCalled();
      expect(mockGetBuyQuote).not.toHaveBeenCalled();
      expect(mockReportRampsError).toHaveBeenCalledWith(
        expect.any(Error),
        { message: 'Missing payment method for native provider flow' },
        'deposit.buildQuote.unexpectedError',
      );
    });

    it('does not throw at the missing-payment-method guard for the non-headless (UB2) path', async () => {
      // UB2 (BuildQuote -> continueWithQuote -> continueNative) never sets
      // `ctx.headlessSessionId`, so even with no resolvable payment method the
      // guard must stay dormant and the flow proceeds unchanged.
      mockUseRampsController.mockReturnValue(
        buildController({
          selectedProvider: NATIVE_PROVIDER,
          selectedPaymentMethod: null,
        }),
      );
      mockCheckExistingToken.mockResolvedValue(false);

      const { result } = renderHook(() => useContinueWithQuote());

      const caught = await invoke(result, NATIVE_PROVIDER_QUOTE);

      // It got past the guard (checkExistingToken ran) and did not report the
      // headless-only missing-payment-method error.
      expect(caught).toBeUndefined();
      expect(mockCheckExistingToken).toHaveBeenCalled();
      expect(mockReportRampsError).not.toHaveBeenCalledWith(
        expect.any(Error),
        { message: 'Missing payment method for native provider flow' },
        'deposit.buildQuote.unexpectedError',
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.RAMP.VERIFY_IDENTITY,
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

  describe('headless external-browser branch (P2.M1 / M4 / M7)', () => {
    const mockExternalReturn = jest.requireMock(
      '../headless/externalBrowserReturn',
    ) as {
      clearExternalReturnCorrelation: jest.Mock;
      completeHeadlessExternalReturn: jest.Mock;
      emitExternalCheckoutClosed: jest.Mock;
      emitExternalOrderFailed: jest.Mock;
      getExternalReturnCorrelation: jest.Mock;
      recordExternalReturnCorrelation: jest.Mock;
    };
    const mockDismissHeadlessFlow = jest.requireMock(
      '../headless/headlessEntryNavigation',
    ).dismissHeadlessFlow as jest.Mock;

    const HEADLESS_SESSION_PARAMS = {
      quote: WIDGET_PROVIDER_QUOTE,
      assetId: 'eip155:1/slip44:60',
      amount: 100,
      rampSurface: 'perps',
    } as unknown as HeadlessBuyParams;

    const CUSTOM_ACTION_QUOTE = {
      provider: 'paypal',
      id: 'quote-custom-1',
      quote: {
        isCustomAction: true,
        buyURL: 'https://paypal.example.com/checkout',
      },
    } as const;

    function startHeadlessSession() {
      const callbacks = {
        onOrderCreated: jest.fn(),
        onError: jest.fn(),
        onClose: jest.fn(),
      };
      const session = createSession(HEADLESS_SESSION_PARAMS, callbacks);
      return { session, callbacks };
    }

    const headlessCtx = (headlessSessionId: string) => ({
      ...CTX,
      headlessSessionId,
    });

    beforeEach(() => {
      __resetSessionRegistryForTests();
      mockDeviceIsAndroid.mockReturnValue(false);
      mockInAppBrowser.isAvailable.mockResolvedValue(true);
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://widget.example.com/session',
        orderId: 'order-1',
      });
      mockExternalReturn.getExternalReturnCorrelation.mockReturnValue(null);
      mockExternalReturn.completeHeadlessExternalReturn.mockResolvedValue({
        providerOrderId: 'order-1',
      });
    });

    it('records the return correlation at external-browser launch', async () => {
      const { session, callbacks } = startHeadlessSession();
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/moonpay?orderId=order-1',
      });
      const { result } = renderHook(() => useContinueWithQuote());

      await invoke(result, WIDGET_PROVIDER_QUOTE, headlessCtx(session.id));

      expect(
        mockExternalReturn.recordExternalReturnCorrelation,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: session.id,
          providerCode: 'moonpay',
          walletAddress: '0x1234567890123456789012345678901234567890',
          orderId: 'order-1',
          rampSurface: 'perps',
          region: 'us-ca',
          onOrderCreated: callbacks.onOrderCreated,
        }),
      );
      // The headless order context is written at LAUNCH so a
      // paid-but-never-returned order that later fails via polling is still
      // tagged HEADLESS + surface.
      const mockSetHeadlessOrderContext = jest.requireMock(
        '../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
      ).setHeadlessOrderContext as jest.Mock;
      expect(mockSetHeadlessOrderContext).toHaveBeenCalledWith('order-1', {
        rampSurface: 'perps',
        region: 'us-ca',
      });
    });

    it('iOS openAuth success resolves into the shared completion and dismisses the flow (E1)', async () => {
      const { session } = startHeadlessSession();
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/moonpay?orderId=order-1',
      });
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx(session.id),
      );

      expect(error).toBeUndefined();
      expect(
        mockExternalReturn.completeHeadlessExternalReturn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: session.id,
          providerCode: 'moonpay',
          returnUrl: 'metamask://on-ramp/providers/moonpay?orderId=order-1',
          walletAddress: '0x1234567890123456789012345678901234567890',
        }),
      );
      expect(mockDismissHeadlessFlow).toHaveBeenCalled();
      expect(mockNavigationReset).not.toHaveBeenCalled();
      expect(mockInAppBrowser.closeAuth).toHaveBeenCalled();
    });

    it('iOS openAuth cancel fires onClose(user_dismissed), emits the closed event, and dismisses', async () => {
      const { session, callbacks } = startHeadlessSession();
      mockExternalReturn.getExternalReturnCorrelation.mockReturnValue({
        sessionId: session.id,
        analytics: { checkoutSessionId: 'checkout-1' },
        launchedAt: Date.now(),
      });
      mockInAppBrowser.openAuth.mockResolvedValue({ type: 'cancel' });
      const { result } = renderHook(() => useContinueWithQuote());

      await invoke(result, WIDGET_PROVIDER_QUOTE, headlessCtx(session.id));

      expect(callbacks.onClose).toHaveBeenCalledWith({
        reason: 'user_dismissed',
      });
      expect(callbacks.onError).not.toHaveBeenCalled();
      expect(mockExternalReturn.emitExternalCheckoutClosed).toHaveBeenCalled();
      expect(
        mockExternalReturn.clearExternalReturnCorrelation,
      ).toHaveBeenCalledWith(session.id);
      expect(mockDismissHeadlessFlow).toHaveBeenCalled();
      expect(mockNavigationReset).not.toHaveBeenCalled();
      expect(getSession(session.id)).toBeUndefined();
    });

    it('completion failure fails the session with QUOTE_FAILED and emits order-failed (P2.M7)', async () => {
      const { session, callbacks } = startHeadlessSession();
      mockExternalReturn.getExternalReturnCorrelation.mockReturnValue({
        sessionId: session.id,
        analytics: { checkoutSessionId: 'checkout-1' },
        launchedAt: Date.now(),
      });
      mockExternalReturn.completeHeadlessExternalReturn.mockRejectedValue(
        new Error('order lookup failed'),
      );
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/moonpay?orderId=order-1',
      });
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx(session.id),
      );

      expect(error).toBeUndefined();
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'QUOTE_FAILED' }),
      );
      expect(callbacks.onClose).not.toHaveBeenCalled();
      expect(mockExternalReturn.emitExternalOrderFailed).toHaveBeenCalled();
      expect(mockDismissHeadlessFlow).toHaveBeenCalled();
      expect(getSession(session.id)).toBeUndefined();
    });

    it('Android launch keeps the session and overlay awaiting the deeplink (no BuildQuote reset)', async () => {
      const { session, callbacks } = startHeadlessSession();
      mockDeviceIsAndroid.mockReturnValue(true);
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx(session.id),
      );

      expect(error).toBeUndefined();
      expect(mockLinkingOpenURL).toHaveBeenCalledWith(
        'https://widget.example.com/session',
      );
      expect(
        mockExternalReturn.recordExternalReturnCorrelation,
      ).toHaveBeenCalled();
      expect(mockNavigationReset).not.toHaveBeenCalled();
      expect(getSession(session.id)).toBeDefined();
      expect(callbacks.onClose).not.toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('Android open failure clears the correlation and throws a QUOTE_FAILED-tagged error', async () => {
      const { session } = startHeadlessSession();
      mockDeviceIsAndroid.mockReturnValue(true);
      mockLinkingOpenURL.mockRejectedValueOnce(new Error('no browser'));
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx(session.id),
      );

      expect(error).toBeDefined();
      expect(
        (error as Error & { headlessBuyErrorCode?: string })
          .headlessBuyErrorCode,
      ).toBe('QUOTE_FAILED');
      expect(
        mockExternalReturn.clearExternalReturnCorrelation,
      ).toHaveBeenCalledWith(session.id);
    });

    it('does not launch a browser for a session that already terminated', async () => {
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx('headless-buy-gone'),
      );

      expect(error).toBeUndefined();
      expect(mockInAppBrowser.openAuth).not.toHaveBeenCalled();
      expect(mockLinkingOpenURL).not.toHaveBeenCalled();
      expect(mockNavigationReset).not.toHaveBeenCalled();
    });

    it('fails fast with QUOTE_FAILED when no wallet address is available', async () => {
      const { session } = startHeadlessSession();
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(result, WIDGET_PROVIDER_QUOTE, {
        ...headlessCtx(session.id),
        walletAddress: '',
      });

      expect(error).toBeDefined();
      expect(
        (error as Error & { headlessBuyErrorCode?: string })
          .headlessBuyErrorCode,
      ).toBe('QUOTE_FAILED');
      expect(mockInAppBrowser.openAuth).not.toHaveBeenCalled();
    });

    it('honors the ctx.redirectUrl override for the buy URL and the interception scheme', async () => {
      const { session } = startHeadlessSession();
      mockInAppBrowser.openAuth.mockResolvedValue({ type: 'cancel' });
      const { result } = renderHook(() => useContinueWithQuote());

      await invoke(result, WIDGET_PROVIDER_QUOTE, {
        ...headlessCtx(session.id),
        redirectUrl: 'metamask://custom-return',
      });

      const quoteForWidget = mockGetBuyWidgetData.mock.calls[0][0];
      expect(quoteForWidget.quote.buyURL).toContain(
        encodeURIComponent('metamask://custom-return'),
      );
      expect(mockInAppBrowser.openAuth).toHaveBeenCalledWith(
        'https://widget.example.com/session',
        'metamask://custom-return',
      );
    });

    it('routes a custom-action quote through the headless external path (P2.M4)', async () => {
      const { session, callbacks } = startHeadlessSession();
      mockInAppBrowser.openAuth.mockResolvedValue({ type: 'cancel' });
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        CUSTOM_ACTION_QUOTE,
        headlessCtx(session.id),
      );

      expect(error).toBeUndefined();
      // Custom actions always take the external path: a deeplink redirect
      // (not the https callback base) and the OS browser sheet.
      expect(mockInAppBrowser.openAuth).toHaveBeenCalledWith(
        'https://widget.example.com/session',
        'metamask://on-ramp/providers/paypal',
      );
      expect(callbacks.onClose).toHaveBeenCalledWith({
        reason: 'user_dismissed',
      });
      expect(mockNavigationReset).not.toHaveBeenCalled();
    });

    it('custom-action success completes through the shared resolver (P2.M4)', async () => {
      const { session } = startHeadlessSession();
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/paypal?orderId=pp-1',
      });
      const { result } = renderHook(() => useContinueWithQuote());

      await invoke(result, CUSTOM_ACTION_QUOTE, headlessCtx(session.id));

      expect(
        mockExternalReturn.completeHeadlessExternalReturn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          providerCode: 'paypal',
          returnUrl: 'metamask://on-ramp/providers/paypal?orderId=pp-1',
        }),
      );
      expect(mockDismissHeadlessFlow).toHaveBeenCalled();
    });

    it('does not dismiss the overlay when completion was handled elsewhere (ownership gating)', async () => {
      const { session, callbacks } = startHeadlessSession();
      mockExternalReturn.completeHeadlessExternalReturn.mockResolvedValue(null);
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/moonpay?orderId=order-1',
      });
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx(session.id),
      );

      expect(error).toBeUndefined();
      expect(mockDismissHeadlessFlow).not.toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
      expect(callbacks.onClose).not.toHaveBeenCalled();
    });

    it('clears the correlation and propagates a tagged error when openAuth itself rejects', async () => {
      const { session } = startHeadlessSession();
      mockInAppBrowser.openAuth.mockRejectedValue(
        new Error('auth session failed'),
      );
      const { result } = renderHook(() => useContinueWithQuote());

      const error = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx(session.id),
      );

      expect(error).toBeDefined();
      expect(
        (error as Error & { headlessBuyErrorCode?: string })
          .headlessBuyErrorCode,
      ).toBe('QUOTE_FAILED');
      expect(
        mockExternalReturn.clearExternalReturnCorrelation,
      ).toHaveBeenCalledWith(session.id);
    });

    it('tags widget-URL failures as QUOTE_FAILED only under a headless session (P2.M7)', async () => {
      const { session } = startHeadlessSession();
      mockGetBuyWidgetData.mockResolvedValue({ url: null });
      const { result } = renderHook(() => useContinueWithQuote());

      const headlessError = await invoke(
        result,
        WIDGET_PROVIDER_QUOTE,
        headlessCtx(session.id),
      );
      expect(
        (headlessError as Error & { headlessBuyErrorCode?: string })
          .headlessBuyErrorCode,
      ).toBe('QUOTE_FAILED');

      const ub2Error = await invoke(result, WIDGET_PROVIDER_QUOTE, CTX);
      expect(
        (ub2Error as Error & { headlessBuyErrorCode?: string })
          .headlessBuyErrorCode,
      ).toBeUndefined();
    });
  });
});
