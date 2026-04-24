import { renderHook, act } from '@testing-library/react-native';
import type {
  Country,
  PaymentMethod,
  Provider,
  RampsOrder,
  TokensResponse,
  UserRegion,
} from '@metamask/ramps-controller';

import { getChainIdFromAssetId, useHeadlessBuy } from './useHeadlessBuy';
import { __resetSessionRegistryForTests, getSession } from './sessionRegistry';
import useRampsController from '../hooks/useRampsController';

const mockNavigate = jest.fn();
const mockGetQuotesRaw = jest.fn();
const mockGetOrderById = jest.fn();
const mockResolveAccount = jest.fn();

jest.mock('../hooks/useRampsController', () => jest.fn());
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../utils/getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: () => 'https://callback.metamask.io',
}));
jest.mock('../Views/HeadlessHost', () => ({
  createHeadlessHostNavDetails: (params: unknown) =>
    ['MockHeadlessHostRoute', { params }] as const,
}));
jest.mock('../../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    RAMP: {
      BUY: 'RampBuy',
      TOKEN_SELECTION: 'RampTokenSelection',
      HEADLESS_HOST: 'RampHeadlessHost',
    },
  },
}));
jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: () => ({}),
    },
  },
}));
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () => mockResolveAccount,
}));
jest.mock('../../../../core/Multichain/utils', () => ({
  getFormattedAddressFromInternalAccount: (account: { address: string }) =>
    account.address,
}));

const mockUserRegion = {
  country: { isoCode: 'FR' },
  state: null,
  regionCode: 'fr',
} as unknown as UserRegion;

const mockTokens = {
  topTokens: [],
  allTokens: [],
} as unknown as TokensResponse;

const mockProviders = [
  { id: 'provider-1', name: 'Provider One' },
  { id: '/providers/transak-native', name: 'Transak', type: 'native' },
] as unknown as Provider[];

const mockPaymentMethods = [
  { id: '/payments/debit-credit-card', name: 'Card' },
] as unknown as PaymentMethod[];

const mockCountries = [
  { isoCode: 'US', name: 'United States' },
] as unknown as Country[];

const mockOrders = [{ providerOrderId: 'order-1' }] as unknown as RampsOrder[];

const baseControllerValue: ReturnType<typeof useRampsController> = {
  userRegion: mockUserRegion,
  setUserRegion: jest.fn(),
  selectedProvider: null,
  setSelectedProvider: jest.fn(),
  providers: mockProviders,
  providersLoading: false,
  providersError: null,
  tokens: mockTokens,
  selectedToken: null,
  setSelectedToken: jest.fn(),
  tokensLoading: false,
  tokensError: null,
  countries: mockCountries,
  countriesLoading: false,
  countriesError: null,
  paymentMethods: mockPaymentMethods,
  selectedPaymentMethod: null,
  setSelectedPaymentMethod: jest.fn(),
  paymentMethodsLoading: false,
  paymentMethodsError: null,
  paymentMethodsFetching: false,
  paymentMethodsStatus: 'idle' as const,
  getQuotes: mockGetQuotesRaw,
  getBuyWidgetData: jest.fn(),
  orders: mockOrders,
  getOrderById: mockGetOrderById,
  addOrder: jest.fn(),
  addPrecreatedOrder: jest.fn(),
  removeOrder: jest.fn(),
  refreshOrder: jest.fn(),
  getOrderFromCallback: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetSessionRegistryForTests();
  (useRampsController as jest.Mock).mockReturnValue(baseControllerValue);
  mockResolveAccount.mockReturnValue({ address: '0xWALLET' });
  mockGetQuotesRaw.mockResolvedValue({
    success: [],
    sorted: [],
    error: [],
    customActions: [],
  });
});

describe('getChainIdFromAssetId', () => {
  it('extracts the chain id from a CAIP-19 asset id', () => {
    expect(getChainIdFromAssetId('eip155:1/erc20:0xabc')).toBe('eip155:1');
    expect(
      getChainIdFromAssetId(
        'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      ),
    ).toBe('eip155:59144');
  });

  it('returns null for malformed inputs', () => {
    expect(getChainIdFromAssetId('not-a-caip')).toBeNull();
    expect(getChainIdFromAssetId('')).toBeNull();
    expect(getChainIdFromAssetId('/erc20:0xabc')).toBeNull();
  });
});

describe('useHeadlessBuy', () => {
  it('forwards catalog data from useRampsController', () => {
    const { result } = renderHook(() => useHeadlessBuy());
    expect(result.current.tokens).toBe(mockTokens);
    expect(result.current.providers).toBe(mockProviders);
    expect(result.current.paymentMethods).toBe(mockPaymentMethods);
    expect(result.current.countries).toBe(mockCountries);
    expect(result.current.userRegion).toBe(mockUserRegion);
    expect(result.current.orders).toBe(mockOrders);
    expect(result.current.getOrderById).toBe(mockGetOrderById);
  });

  it('falls back to empty arrays when collections are missing', () => {
    (useRampsController as jest.Mock).mockReturnValue({
      ...baseControllerValue,
      providers: undefined,
      paymentMethods: undefined,
      countries: undefined,
    });
    const { result } = renderHook(() => useHeadlessBuy());
    expect(result.current.providers).toEqual([]);
    expect(result.current.paymentMethods).toEqual([]);
    expect(result.current.countries).toEqual([]);
  });

  describe('isLoading', () => {
    it('is false when nothing is loading', () => {
      const { result } = renderHook(() => useHeadlessBuy());
      expect(result.current.isLoading).toBe(false);
    });

    it.each([
      'tokensLoading',
      'providersLoading',
      'paymentMethodsLoading',
      'countriesLoading',
    ] as const)('is true when %s is true', (flag) => {
      (useRampsController as jest.Mock).mockReturnValue({
        ...baseControllerValue,
        [flag]: true,
      });
      const { result } = renderHook(() => useHeadlessBuy());
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('errors', () => {
    it('aggregates per-source errors', () => {
      (useRampsController as jest.Mock).mockReturnValue({
        ...baseControllerValue,
        tokensError: 'tokens-bad',
        providersError: 'providers-bad',
        paymentMethodsError: 'payments-bad',
        countriesError: 'countries-bad',
      });
      const { result } = renderHook(() => useHeadlessBuy());
      expect(result.current.errors).toEqual({
        tokens: 'tokens-bad',
        providers: 'providers-bad',
        paymentMethods: 'payments-bad',
        countries: 'countries-bad',
      });
    });

    it('returns null per source when there are no errors', () => {
      const { result } = renderHook(() => useHeadlessBuy());
      expect(result.current.errors).toEqual({
        tokens: null,
        providers: null,
        paymentMethods: null,
        countries: null,
      });
    });
  });

  describe('getQuotes', () => {
    it('resolves the wallet address from the selected account scope and forwards params', async () => {
      const { result } = renderHook(() => useHeadlessBuy());
      await act(async () => {
        await result.current.getQuotes({
          assetId: 'eip155:59144/erc20:0xabc',
          amount: 25,
          paymentMethodIds: ['/payments/debit-credit-card'],
          providerIds: ['/providers/transak-native'],
        });
      });
      expect(mockResolveAccount).toHaveBeenCalledWith('eip155:59144');
      expect(mockGetQuotesRaw).toHaveBeenCalledWith({
        assetId: 'eip155:59144/erc20:0xabc',
        amount: 25,
        walletAddress: '0xWALLET',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['/providers/transak-native'],
        redirectUrl: 'https://callback.metamask.io',
        forceRefresh: undefined,
      });
    });

    it('uses an explicit walletAddress override when provided', async () => {
      const { result } = renderHook(() => useHeadlessBuy());
      await act(async () => {
        await result.current.getQuotes({
          assetId: 'eip155:1/erc20:0xabc',
          amount: 10,
          walletAddress: '0xOVERRIDE',
        });
      });
      expect(mockResolveAccount).not.toHaveBeenCalled();
      expect(mockGetQuotesRaw).toHaveBeenCalledWith(
        expect.objectContaining({ walletAddress: '0xOVERRIDE' }),
      );
    });

    it('uses an explicit redirectUrl override when provided', async () => {
      const { result } = renderHook(() => useHeadlessBuy());
      await act(async () => {
        await result.current.getQuotes({
          assetId: 'eip155:1/erc20:0xabc',
          amount: 10,
          walletAddress: '0xOVERRIDE',
          redirectUrl: 'https://example.test/callback',
        });
      });
      expect(mockGetQuotesRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: 'https://example.test/callback',
        }),
      );
    });

    it('forwards forceRefresh to the controller', async () => {
      const { result } = renderHook(() => useHeadlessBuy());
      await act(async () => {
        await result.current.getQuotes({
          assetId: 'eip155:1/erc20:0xabc',
          amount: 10,
          walletAddress: '0xOVERRIDE',
          forceRefresh: true,
        });
      });
      expect(mockGetQuotesRaw).toHaveBeenCalledWith(
        expect.objectContaining({ forceRefresh: true }),
      );
    });

    it('throws when no wallet can be resolved and none was provided', async () => {
      mockResolveAccount.mockReturnValue(undefined);
      const { result } = renderHook(() => useHeadlessBuy());
      await expect(
        result.current.getQuotes({
          assetId: 'eip155:9999/erc20:0xabc',
          amount: 10,
        }),
      ).rejects.toThrow(/could not resolve wallet address/);
      expect(mockGetQuotesRaw).not.toHaveBeenCalled();
    });

    it('throws when the assetId is malformed and no wallet is provided', async () => {
      const { result } = renderHook(() => useHeadlessBuy());
      await expect(
        result.current.getQuotes({
          assetId: 'malformed-asset-id',
          amount: 10,
        }),
      ).rejects.toThrow(/could not resolve wallet address/);
      expect(mockGetQuotesRaw).not.toHaveBeenCalled();
    });
  });

  describe('startHeadlessBuy', () => {
    // Phase 5: startHeadlessBuy is now quote-first. Callers must hand us a
    // Quote (typically picked from `getQuotes(...)` results) plus the asset
    // and amount they used to fetch it. The Host derives everything else
    // from the quote.
    const sampleQuote = {
      provider: '/providers/transak-native',
      quote: {
        amountIn: 25,
        amountOut: 0.01,
        paymentMethod: '/payments/debit-credit-card',
      },
      providerInfo: {
        id: '/providers/transak-native',
        name: 'Transak',
        type: 'native' as const,
      },
    } as unknown as Parameters<
      ReturnType<typeof useHeadlessBuy>['startHeadlessBuy']
    >[0]['quote'];

    const baseStartParams = {
      quote: sampleQuote,
      assetId: 'eip155:59144/erc20:0xabc',
      amount: 25,
    };

    function buildCallbacks() {
      return {
        onOrderCreated: jest.fn(),
        onError: jest.fn(),
        onClose: jest.fn(),
      };
    }

    it('creates a registry session and returns its id', () => {
      const { result } = renderHook(() => useHeadlessBuy());
      const callbacks = buildCallbacks();
      let started: { sessionId: string; cancel: () => void } | undefined;
      act(() => {
        started = result.current.startHeadlessBuy(baseStartParams, callbacks);
      });
      if (!started) {
        throw new Error('startHeadlessBuy did not return a session');
      }
      expect(started.sessionId).toMatch(/^headless-buy-/);
      const session = getSession(started.sessionId);
      expect(session?.params).toEqual(baseStartParams);
      expect(session?.callbacks).toBe(callbacks);
      expect(session?.status).toBe('pending');
    });

    it('seeds the controller with the quote token, provider and payment method', () => {
      // Mirrors what BuildQuote does before calling continueWithQuote. The
      // native auth loop (OtpCode, useTransakRouting) reads selectedToken,
      // selectedPaymentMethod and walletAddress from the controller; without
      // seeding these are null in headless mode, breaking post-OTP routing.
      const setters = {
        setSelectedToken: jest.fn(),
        setSelectedProvider: jest.fn(),
        setSelectedPaymentMethod: jest.fn(),
      };
      (useRampsController as jest.Mock).mockReturnValue({
        ...baseControllerValue,
        ...setters,
      });
      const { result } = renderHook(() => useHeadlessBuy());
      act(() => {
        result.current.startHeadlessBuy(baseStartParams, buildCallbacks());
      });
      expect(setters.setSelectedToken).toHaveBeenCalledWith(
        baseStartParams.assetId,
      );
      expect(setters.setSelectedProvider).toHaveBeenCalledWith(
        expect.objectContaining({ id: '/providers/transak-native' }),
      );
      expect(setters.setSelectedPaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({ id: '/payments/debit-credit-card' }),
      );
    });

    it('seeds provider as null when quote provider is not in the loaded catalog', () => {
      const setSelectedProvider = jest.fn();
      (useRampsController as jest.Mock).mockReturnValue({
        ...baseControllerValue,
        providers: [{ id: 'other-provider', name: 'Other' }],
        setSelectedProvider,
      });
      const { result } = renderHook(() => useHeadlessBuy());
      act(() => {
        result.current.startHeadlessBuy(baseStartParams, buildCallbacks());
      });
      expect(setSelectedProvider).toHaveBeenCalledWith(null);
    });

    it('persists currency and paymentMethodId overrides on the session params', () => {
      const { result } = renderHook(() => useHeadlessBuy());
      let started: { sessionId: string; cancel: () => void } | undefined;
      act(() => {
        started = result.current.startHeadlessBuy(
          {
            ...baseStartParams,
            currency: 'EUR',
            paymentMethodId: '/payments/debit-credit-card',
          },
          buildCallbacks(),
        );
      });
      if (!started) {
        throw new Error('startHeadlessBuy did not return a session');
      }
      expect(getSession(started.sessionId)?.params).toEqual({
        ...baseStartParams,
        currency: 'EUR',
        paymentMethodId: '/payments/debit-credit-card',
      });
    });

    it('navigates into the Ramp inner stack and pins HEADLESS_HOST as the nested screen', () => {
      // The Host lives inside the Ramp inner Stack so that all
      // post-auth reset targets (`Checkout`, `BasicInfo`, `KycWebview`,
      // ...) resolve to the same navigator. We have to reach it via the
      // Ramp BUY entry with two levels of nested-screen descriptors.
      const { result } = renderHook(() => useHeadlessBuy());
      let started: { sessionId: string; cancel: () => void } | undefined;
      act(() => {
        started = result.current.startHeadlessBuy(
          baseStartParams,
          buildCallbacks(),
        );
      });
      if (!started) {
        throw new Error('startHeadlessBuy did not return a session');
      }
      expect(mockNavigate).toHaveBeenCalledWith('RampTokenSelection', {
        screen: 'RampTokenSelection',
        params: {
          screen: 'RampHeadlessHost',
          params: { headlessSessionId: started.sessionId },
        },
      });
    });

    it('cancel() ends the session and fires onClose with consumer_cancelled', () => {
      const { result } = renderHook(() => useHeadlessBuy());
      const callbacks = buildCallbacks();
      let started: { sessionId: string; cancel: () => void } | undefined;
      act(() => {
        started = result.current.startHeadlessBuy(baseStartParams, callbacks);
      });
      if (!started) {
        throw new Error('startHeadlessBuy did not return a session');
      }
      act(() => {
        started?.cancel();
      });
      expect(getSession(started.sessionId)).toBeUndefined();
      expect(callbacks.onClose).toHaveBeenCalledWith({
        reason: 'consumer_cancelled',
      });
      expect(callbacks.onOrderCreated).not.toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('auto-cancels a previous active session when a new one is started', () => {
      const { result } = renderHook(() => useHeadlessBuy());
      const firstCallbacks = buildCallbacks();
      const secondCallbacks = buildCallbacks();
      let first: { sessionId: string; cancel: () => void } | undefined;
      act(() => {
        first = result.current.startHeadlessBuy(
          baseStartParams,
          firstCallbacks,
        );
      });
      act(() => {
        result.current.startHeadlessBuy(baseStartParams, secondCallbacks);
      });
      if (!first) {
        throw new Error('startHeadlessBuy did not return the first session');
      }
      expect(getSession(first.sessionId)).toBeUndefined();
      expect(firstCallbacks.onClose).toHaveBeenCalledWith({
        reason: 'consumer_cancelled',
      });
      expect(secondCallbacks.onClose).not.toHaveBeenCalled();
    });
  });
});
