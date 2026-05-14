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
      // Shape mirrors what selectors expect: state.engine.backgroundState
      getState: () => ({
        engine: { backgroundState: { RampsController: { orders: [] } } },
      }),
      subscribe: () => () => undefined,
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
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- back-compat anchor
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

    // Fix #2 — provider rejection inspection. UB2 handles `success.length === 0
    // && error.length > 0` at BuildQuote.tsx:683-687; headless mode previously
    // returned the raw response silently. This block exercises the inspection
    // + Design B (active-session routing) + classification logic.
    describe('provider rejection inspection (Fix #2)', () => {
      const sampleQuote = {
        provider: '/providers/transak-native',
        quote: {
          amountIn: 5,
          amountOut: 0.001,
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
        amount: 5,
      };
      const getQuotesParams = {
        assetId: 'eip155:59144/erc20:0xabc',
        amount: 5,
        walletAddress: '0xWALLET',
      };

      it('rejects with LIMIT_EXCEEDED and routes through the active session', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [{ provider: 'transak', error: 'Below minimum buy amount' }],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        const callbacks = {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        };
        let sessionId: string | undefined;
        act(() => {
          sessionId = result.current.startHeadlessBuy(
            baseStartParams,
            callbacks,
          ).sessionId;
        });
        await expect(
          act(async () => {
            await result.current.getQuotes(getQuotesParams);
          }),
        ).rejects.toMatchObject({
          headlessBuyErrorCode: 'LIMIT_EXCEEDED',
        });
        expect(callbacks.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'LIMIT_EXCEEDED',
            details: expect.objectContaining({
              providerErrors: [
                expect.objectContaining({
                  provider: 'transak',
                  message: 'Below minimum buy amount',
                }),
              ],
              successCount: 0,
              errorCount: 1,
              // Discriminator parity with the static (pre-network) path —
              // see `buildStaticBoundsRejection` in useHeadlessBuy.ts.
              source: 'network-reject',
            }),
          }),
        );
        expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
        expect(sessionId).toBeDefined();
        expect(getSession(sessionId)).toBeUndefined();
      });

      it('rejects with the structured error when no session is active', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [{ provider: 'transak', error: 'Below minimum buy amount' }],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(getQuotesParams),
        ).rejects.toMatchObject({
          headlessBuyErrorCode: 'LIMIT_EXCEEDED',
          details: expect.objectContaining({ errorCount: 1, successCount: 0 }),
        });
      });

      it('maps non-limit messages to QUOTE_FAILED', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [
            { provider: 'transak', error: 'Payment provider unavailable' },
          ],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(getQuotesParams),
        ).rejects.toMatchObject({ headlessBuyErrorCode: 'QUOTE_FAILED' });
      });

      it('treats "Rate limit exceeded" as QUOTE_FAILED, not LIMIT_EXCEEDED', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [{ provider: 'transak', error: 'Rate limit exceeded' }],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(getQuotesParams),
        ).rejects.toMatchObject({ headlessBuyErrorCode: 'QUOTE_FAILED' });
      });

      it('prefers structured SDK code (`code` field) over message parsing', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [
            {
              provider: 'transak',
              error: 'Some unrelated message',
              code: 'AMOUNT_LIMIT_EXCEEDED',
            },
          ],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(getQuotesParams),
        ).rejects.toMatchObject({ headlessBuyErrorCode: 'LIMIT_EXCEEDED' });
      });

      // Cursor Bugbot regression guard — classification is per-provider, not
      // aggregate. If provider A returns a buy-limit code and provider B
      // returns a rate-limit code, B should NOT veto A's verdict.
      it('classifies per provider — one limit + one rate-limit still maps to LIMIT_EXCEEDED', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [
            {
              provider: 'transak',
              error: 'Below minimum buy amount',
              code: 'AMOUNT_LIMIT_EXCEEDED',
            },
            {
              provider: 'moonpay',
              error: 'Provider throttled — try again later',
              code: 'RATE_LIMIT_EXCEEDED',
            },
          ],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(getQuotesParams),
        ).rejects.toMatchObject({ headlessBuyErrorCode: 'LIMIT_EXCEEDED' });
      });

      // Second Cursor Bugbot regression — the same per-provider rule must
      // hold for the message-regex fallback path (when providers don't
      // return structured `code` fields). Previously this used
      // `combinedMessage` which joined all provider messages together,
      // so "Rate limit exceeded" from B contaminated the "Below minimum"
      // signal from A.
      it('classifies per provider on the message-regex path too (no SDK codes)', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [
            { provider: 'transak', error: 'Below minimum buy amount' },
            { provider: 'moonpay', error: 'Rate limit exceeded' },
          ],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(getQuotesParams),
        ).rejects.toMatchObject({ headlessBuyErrorCode: 'LIMIT_EXCEEDED' });
      });

      it('returns the response unchanged when both success and error are empty', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce({
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(getQuotesParams),
        ).resolves.toEqual({
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        });
      });

      it('returns the response unchanged when success is non-empty (happy path)', async () => {
        const happyResponse = {
          success: [{ provider: 'transak', amountOut: 0.01 }],
          sorted: [{ provider: 'transak', amountOut: 0.01 }],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happyResponse);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(result.current.getQuotes(getQuotesParams)).resolves.toBe(
          happyResponse,
        );
      });
    });

    // Fix #2 follow-up / Suggestion #2 — pre-quote static bounds check that
    // mirrors UB2: when every `(provider × paymentMethodId)` candidate has
    // known bounds AND `params.amount` falls outside them, short-circuit
    // with `LIMIT_EXCEEDED` instead of paying the network round-trip.
    describe('pre-quote static bounds check (Suggestion #2)', () => {
      // Helper: build a providers catalog with bounds wired into
      // `provider.limits.fiat[currency][paymentMethodId]`. Mirrors the
      // shape `getProviderBuyLimit` reads from.
      const buildProvidersWithBounds = (
        rows: {
          id: string;
          currency: string;
          paymentMethodId: string;
          minAmount: number;
          maxAmount: number;
        }[],
      ): Provider[] => {
        const byProviderId: Record<string, Provider> = {};
        for (const r of rows) {
          if (!byProviderId[r.id]) {
            byProviderId[r.id] = {
              id: r.id,
              name: r.id,
              limits: { fiat: {} as Record<string, unknown> },
            } as unknown as Provider;
          }
          const limits = byProviderId[r.id].limits as unknown as {
            fiat: Record<string, Record<string, unknown>>;
          };
          if (!limits.fiat[r.currency.toLowerCase()]) {
            limits.fiat[r.currency.toLowerCase()] = {};
          }
          limits.fiat[r.currency.toLowerCase()][r.paymentMethodId] = {
            minAmount: r.minAmount,
            maxAmount: r.maxAmount,
          };
        }
        return Object.values(byProviderId);
      };

      const baseQuotesParams = {
        assetId: 'eip155:59144/erc20:0xabc',
        amount: 5,
        walletAddress: '0xWALLET',
        paymentMethodIds: ['/payments/debit-credit-card'],
        providerIds: ['/providers/transak-native'],
      };

      it('short-circuits with LIMIT_EXCEEDED when amount < min for the only candidate', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 5 }),
        ).rejects.toMatchObject({
          headlessBuyErrorCode: 'LIMIT_EXCEEDED',
          details: expect.objectContaining({
            amount: 5,
            currency: 'EUR',
            source: 'static-bounds',
            rejections: [
              expect.objectContaining({
                provider: '/providers/transak-native',
                paymentMethodId: '/payments/debit-credit-card',
                minAmount: 10,
                maxAmount: 5000,
              }),
            ],
          }),
        });
        // Network was NOT called — that's the whole point.
        expect(mockGetQuotesRaw).not.toHaveBeenCalled();
      });

      it('short-circuits when amount > max', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 999999 }),
        ).rejects.toMatchObject({
          headlessBuyErrorCode: 'LIMIT_EXCEEDED',
        });
        expect(mockGetQuotesRaw).not.toHaveBeenCalled();
      });

      it('routes the static rejection through an active session (Design B)', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const { result } = renderHook(() => useHeadlessBuy());
        const callbacks = {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        };
        // startHeadlessBuy reads `params.quote.quote.paymentMethod` for
        // controller seeding — keep this shape minimal but valid.
        const seedQuote = {
          provider: '/providers/transak-native',
          quote: {
            amountIn: 5,
            amountOut: 0.001,
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
        let sessionId: string | undefined;
        act(() => {
          sessionId = result.current.startHeadlessBuy(
            {
              quote: seedQuote,
              assetId: 'eip155:59144/erc20:0xabc',
              amount: 5,
            },
            callbacks,
          ).sessionId;
        });
        await expect(
          act(async () => {
            await result.current.getQuotes({
              ...baseQuotesParams,
              amount: 5,
            });
          }),
        ).rejects.toMatchObject({ headlessBuyErrorCode: 'LIMIT_EXCEEDED' });
        expect(callbacks.onError).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'LIMIT_EXCEEDED' }),
        );
        expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
        expect(sessionId).toBeDefined();
        expect(getSession(sessionId)).toBeUndefined();
      });

      it('falls through to the network when at least one candidate passes', async () => {
        // Two providers — one rejects, one accepts. Network must still run.
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
            {
              id: '/providers/moonpay',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 1,
              maxAmount: 100,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [{ provider: 'moonpay' }],
          sorted: [{ provider: 'moonpay' }],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({
            ...baseQuotesParams,
            amount: 5,
            providerIds: ['/providers/transak-native', '/providers/moonpay'],
          }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('falls through when bounds are unknown for any candidate (treats unknown as not-a-rejection)', async () => {
        // Provider exists but has no bounds row for this (currency,
        // paymentMethod) — we can't be certain, so let the network decide.
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: [
            {
              id: '/providers/transak-native',
              name: 'Transak',
              limits: { fiat: {} },
            } as unknown as Provider,
          ],
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [{ provider: 'transak' }],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(result.current.getQuotes(baseQuotesParams)).resolves.toBe(
          happy,
        );
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('falls through when an unrecognized providerId is requested (no catalog entry → unknown)', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: [],
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(result.current.getQuotes(baseQuotesParams)).resolves.toBe(
          happy,
        );
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      // Coverage test: catalog has SOME providers, but the caller asked for
      // a provider that isn't among them. Exercises the unknown-provider
      // branch inside the candidate-building loop (different from
      // `providers: []` which short-circuits before the loop runs).
      it('falls through when a requested providerId is missing from a non-empty catalog', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          // Catalog has a different provider than the one the caller asked
          // for. Forces the loop to take the `if (!provider)` branch and
          // record `bounds: undefined` for each paymentMethod.
          providers: buildProvidersWithBounds([
            {
              id: '/providers/moonpay',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({
            ...baseQuotesParams,
            amount: 5,
            // Asks for a provider the catalog doesn't have — `find`
            // returns undefined and the loop takes the unknown branch.
            providerIds: ['/providers/unknown'],
          }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('falls through when providerIds is omitted (no candidates to enumerate without a network call)', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({
            assetId: 'eip155:59144/erc20:0xabc',
            amount: 5,
            walletAddress: '0xWALLET',
            paymentMethodIds: ['/payments/debit-credit-card'],
            // providerIds intentionally omitted
          }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('honors an explicit params.currency override (does not require userRegion currency)', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'USD',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          // userRegion has no currency — bounds check would skip without
          // params.currency.
          userRegion: { ...mockUserRegion, country: { isoCode: 'FR' } },
        });
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({
            ...baseQuotesParams,
            amount: 5,
            currency: 'USD',
          }),
        ).rejects.toMatchObject({
          headlessBuyErrorCode: 'LIMIT_EXCEEDED',
          details: expect.objectContaining({ currency: 'USD' }),
        });
      });

      it('falls through when currency cannot be resolved (no params.currency, no userRegion currency)', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: { ...mockUserRegion, country: { isoCode: 'FR' } },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 5 }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('amount exactly at the boundary (=== minAmount or === maxAmount) is treated as in-bounds', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValue(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        // exactly minAmount
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 10 }),
        ).resolves.toBe(happy);
        // exactly maxAmount
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 5000 }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalledTimes(2);
      });

      it('Suggestion #1: getProviderBuyLimit is exported from the public headless barrel', () => {
        // Defensive test — protects against a future refactor breaking the
        // re-export chain MMPay (`TransactionPayController`) depends on.
        const headless = jest.requireActual('./');
        expect(typeof headless.getProviderBuyLimit).toBe('function');
        const bounds = headless.getProviderBuyLimit(
          {
            limits: {
              fiat: { eur: { card: { minAmount: 10, maxAmount: 5000 } } },
            },
          },
          'EUR',
          'card',
        );
        expect(bounds).toEqual({ minAmount: 10, maxAmount: 5000 });
      });

      it('skips the pre-flight when amount is 0 (UB2 parity: useProviderLimits returns null for amount <= 0)', async () => {
        // Same setup that would normally reject — only `amount` differs.
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        // amount 0 (and any non-positive) must not short-circuit — a consumer
        // calling getQuotes mid-typing shouldn't tear down their session.
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 0 }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('skips the pre-flight when amount is NaN (defensive — falls through to the network)', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: Number.NaN }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('falls through when one provider × two payment methods has a known-accept + known-reject mix', async () => {
        // Same provider, two payment methods: card rejects (min 10), bank
        // transfer accepts (min 1). Single passing candidate is enough.
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/bank-transfer',
              minAmount: 1,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [{ provider: 'transak' }],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({
            ...baseQuotesParams,
            amount: 5,
            paymentMethodIds: [
              '/payments/debit-credit-card',
              '/payments/bank-transfer',
            ],
          }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('falls through when paymentMethodIds is an empty array', async () => {
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: buildProvidersWithBounds([
            {
              id: '/providers/transak-native',
              currency: 'EUR',
              paymentMethodId: '/payments/debit-credit-card',
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({
            ...baseQuotesParams,
            amount: 5,
            paymentMethodIds: [],
          }),
        ).resolves.toBe(happy);
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('falls through when provider.limits is entirely undefined', async () => {
        // Belt-and-braces: getProviderBuyLimit handles `limits === undefined`
        // via optional chaining, but a regression that introduces non-
        // optional access wouldn't be caught by the empty-fiat-object test.
        (useRampsController as jest.Mock).mockReturnValue({
          ...baseControllerValue,
          providers: [
            {
              id: '/providers/transak-native',
              name: 'Transak',
              // intentionally no `limits` field
            } as unknown as Provider,
          ],
          userRegion: {
            ...mockUserRegion,
            country: { isoCode: 'FR', currency: 'EUR' },
          },
        });
        const happy = {
          success: [],
          sorted: [],
          error: [],
          customActions: [],
        };
        mockGetQuotesRaw.mockResolvedValueOnce(happy);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(result.current.getQuotes(baseQuotesParams)).resolves.toBe(
          happy,
        );
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });
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

    it('fires the previous session onClose before seeding the controller for the new session', () => {
      const order: string[] = [];
      const firstCallbacks = {
        onOrderCreated: jest.fn(),
        onError: jest.fn(),
        onClose: jest.fn(() => {
          order.push('first-onClose');
        }),
      };
      const setSelectedToken = jest.fn(() => {
        order.push('setSelectedToken');
      });
      const setSelectedProvider = jest.fn(() => {
        order.push('setSelectedProvider');
      });
      const setSelectedPaymentMethod = jest.fn(() => {
        order.push('setSelectedPaymentMethod');
      });
      (useRampsController as jest.Mock).mockReturnValue({
        ...baseControllerValue,
        setSelectedToken,
        setSelectedProvider,
        setSelectedPaymentMethod,
      });
      const { result } = renderHook(() => useHeadlessBuy());
      act(() => {
        result.current.startHeadlessBuy(baseStartParams, firstCallbacks);
      });
      act(() => {
        result.current.startHeadlessBuy(baseStartParams, buildCallbacks());
      });
      const closeIdx = order.indexOf('first-onClose');
      expect(closeIdx).toBeGreaterThan(-1);
      // Second start: closeSession (onClose) then the three controller seeds.
      expect(order.slice(closeIdx + 1, closeIdx + 4)).toEqual([
        'setSelectedToken',
        'setSelectedProvider',
        'setSelectedPaymentMethod',
      ]);
    });
  });

});
