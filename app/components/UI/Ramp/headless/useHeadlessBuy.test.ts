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
      HEADLESS_ENTRY: 'RampHeadlessEntry',
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

    const assetId = 'eip155:59144/erc20:0xabc';
    const cardPaymentMethod = '/payments/debit-credit-card';
    const bankPaymentMethod = '/payments/bank-transfer';
    const transakProvider = '/providers/transak-native';
    const moonpayProvider = '/providers/moonpay';
    const regionWithCurrency = (currency?: string) => ({
      ...mockUserRegion,
      country: currency ? { isoCode: 'FR', currency } : { isoCode: 'FR' },
    });
    const baseQuotesParams = {
      assetId,
      amount: 5,
      walletAddress: '0xWALLET',
      paymentMethodIds: [cardPaymentMethod],
      providerIds: [transakProvider],
    };
    const emptyQuotesResponse = {
      success: [],
      sorted: [],
      error: [],
      customActions: [],
    };
    const quoteResponse = (overrides = {}) => ({
      ...emptyQuotesResponse,
      ...overrides,
    });
    const useControllerValue = (overrides: Record<string, unknown>) => {
      (useRampsController as jest.Mock).mockReturnValue({
        ...baseControllerValue,
        ...overrides,
      });
    };
    const seedQuote = {
      provider: transakProvider,
      quote: {
        amountIn: 5,
        amountOut: 0.001,
        paymentMethod: cardPaymentMethod,
      },
      providerInfo: {
        id: transakProvider,
        name: 'Transak',
        type: 'native' as const,
      },
    } as unknown as Parameters<
      ReturnType<typeof useHeadlessBuy>['startHeadlessBuy']
    >[0]['quote'];
    const startParams = { quote: seedQuote, assetId, amount: 5 };
    const startActiveSession = () => {
      const { result } = renderHook(() => useHeadlessBuy());
      const callbacks = {
        onOrderCreated: jest.fn(),
        onError: jest.fn(),
        onClose: jest.fn(),
      };
      let sessionId: string | undefined;
      act(() => {
        sessionId = result.current.startHeadlessBuy(
          startParams,
          callbacks,
        ).sessionId;
      });
      return { callbacks, result, sessionId };
    };
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
      for (const row of rows) {
        if (!byProviderId[row.id]) {
          byProviderId[row.id] = {
            id: row.id,
            name: row.id,
            limits: { fiat: {} as Record<string, unknown> },
          } as unknown as Provider;
        }
        const limits = byProviderId[row.id].limits as unknown as {
          fiat: Record<string, Record<string, unknown>>;
        };
        if (!limits.fiat[row.currency.toLowerCase()]) {
          limits.fiat[row.currency.toLowerCase()] = {};
        }
        limits.fiat[row.currency.toLowerCase()][row.paymentMethodId] = {
          minAmount: row.minAmount,
          maxAmount: row.maxAmount,
        };
      }
      return Object.values(byProviderId);
    };
    const transakEurBounds = [
      {
        id: transakProvider,
        currency: 'EUR',
        paymentMethodId: cardPaymentMethod,
        minAmount: 10,
        maxAmount: 5000,
      },
    ];
    const expectNetworkPassThrough = async ({
      providers = buildProvidersWithBounds(transakEurBounds),
      params = {},
      response = quoteResponse(),
      userRegion = regionWithCurrency('EUR'),
    } = {}) => {
      useControllerValue({ providers, userRegion });
      mockGetQuotesRaw.mockResolvedValueOnce(response);
      const { result } = renderHook(() => useHeadlessBuy());
      await expect(
        result.current.getQuotes({ ...baseQuotesParams, ...params }),
      ).resolves.toBe(response);
      expect(mockGetQuotesRaw).toHaveBeenCalled();
    };

    describe('provider rejection inspection (Fix #2)', () => {
      it('rejects with LIMIT_EXCEEDED and routes through the active session', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce(
          quoteResponse({
            error: [{ provider: 'transak', error: 'Below minimum buy amount' }],
          }),
        );
        const { callbacks, result, sessionId } = startActiveSession();

        await expect(
          act(async () => {
            await result.current.getQuotes(baseQuotesParams);
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
              source: 'network-reject',
            }),
          }),
        );
        expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
        expect(sessionId).toBeDefined();
        expect(getSession(sessionId)).toBeUndefined();
      });

      it('rejects with the structured error when no session is active', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce(
          quoteResponse({
            error: [{ provider: 'transak', error: 'Below minimum buy amount' }],
          }),
        );
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(baseQuotesParams),
        ).rejects.toMatchObject({
          headlessBuyErrorCode: 'LIMIT_EXCEEDED',
          details: expect.objectContaining({ errorCount: 1, successCount: 0 }),
        });
      });

      it.each([
        [
          'non-limit messages',
          [{ provider: 'transak', error: 'Payment provider unavailable' }],
          'QUOTE_FAILED',
        ],
        [
          'rate-limit messages',
          [{ provider: 'transak', error: 'Rate limit exceeded' }],
          'QUOTE_FAILED',
        ],
        [
          'SDK limit codes over message parsing',
          [
            {
              provider: 'transak',
              error: 'Some unrelated message',
              code: 'AMOUNT_LIMIT_EXCEEDED',
            },
          ],
          'LIMIT_EXCEEDED',
        ],
        [
          'mixed provider SDK codes',
          [
            {
              provider: 'transak',
              error: 'Below minimum buy amount',
              code: 'AMOUNT_LIMIT_EXCEEDED',
            },
            {
              provider: 'moonpay',
              error: 'Provider throttled - try again later',
              code: 'RATE_LIMIT_EXCEEDED',
            },
          ],
          'LIMIT_EXCEEDED',
        ],
        [
          'mixed provider messages without codes',
          [
            { provider: 'transak', error: 'Below minimum buy amount' },
            { provider: 'moonpay', error: 'Rate limit exceeded' },
          ],
          'LIMIT_EXCEEDED',
        ],
      ])('classifies %s as %s', async (_name, error, headlessBuyErrorCode) => {
        mockGetQuotesRaw.mockResolvedValueOnce(quoteResponse({ error }));
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes(baseQuotesParams),
        ).rejects.toMatchObject({ headlessBuyErrorCode });
      });

      it.each([
        ['empty success and error', quoteResponse()],
        [
          'non-empty success',
          quoteResponse({
            success: [{ provider: 'transak', amountOut: 0.01 }],
            sorted: [{ provider: 'transak', amountOut: 0.01 }],
          }),
        ],
      ])('returns the response unchanged when %s', async (_name, response) => {
        mockGetQuotesRaw.mockResolvedValueOnce(response);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(result.current.getQuotes(baseQuotesParams)).resolves.toBe(
          response,
        );
      });

      it('returns an undefined quote response unchanged', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce(undefined);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(result.current.getQuotes(baseQuotesParams)).resolves.toBe(
          undefined,
        );
      });

      it('fails the session captured at getQuotes() entry, not whatever is active after the await', async () => {
        // Regression: if a concurrent startHeadlessBuy() swaps the active
        // session while getQuotesRaw is in flight, getActiveSessionId() after
        // the await would return the *new* session's id. Failing that session
        // with the in-flight call's error would terminate the wrong session.
        let resolveQuotes: (value: unknown) => void = () => undefined;
        mockGetQuotesRaw.mockReturnValueOnce(
          new Promise((resolve) => {
            resolveQuotes = resolve;
          }),
        );

        const { result } = renderHook(() => useHeadlessBuy());
        const firstCallbacks = {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        };
        let firstSessionId: string | undefined;
        act(() => {
          firstSessionId = result.current.startHeadlessBuy(
            startParams,
            firstCallbacks,
          ).sessionId;
        });

        // Kick off getQuotes against session A; it will await resolveQuotes.
        const quotesPromise = result.current
          .getQuotes(baseQuotesParams)
          .catch(() => undefined);

        // While the await is pending, swap to session B.
        const secondCallbacks = {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        };
        let secondSessionId: string | undefined;
        act(() => {
          secondSessionId = result.current.startHeadlessBuy(
            startParams,
            secondCallbacks,
          ).sessionId;
        });
        expect(secondSessionId).not.toBe(firstSessionId);

        await act(async () => {
          resolveQuotes(
            quoteResponse({
              error: [
                { provider: 'transak', error: 'Below minimum buy amount' },
              ],
            }),
          );
          await quotesPromise;
        });

        // The bug we're guarding against: under the racy code path, the
        // post-await getActiveSessionId() returned session B's id, so
        // failSession terminated session B with session A's error. With the
        // fix, the id captured at getQuotes() entry (session A) is used —
        // it's already closed by startHeadlessBuy(B), so the failSession call
        // is a no-op. Session B must remain alive and unfailed.
        expect(secondCallbacks.onError).not.toHaveBeenCalled();
        expect(secondCallbacks.onClose).not.toHaveBeenCalled();
        expect(getSession(secondSessionId as string)).toBeDefined();
        // Session A was cancelled by starting session B, so its onClose
        // fired with the consumer_cancelled reason — not the network error.
        expect(firstCallbacks.onClose).toHaveBeenCalledWith({
          reason: 'consumer_cancelled',
        });
        expect(firstCallbacks.onError).not.toHaveBeenCalled();
      });

      it('normalizes malformed provider rejections to unknown/no-message details', async () => {
        mockGetQuotesRaw.mockResolvedValueOnce(
          quoteResponse({
            error: [{ provider: { id: 'not-a-string' } }],
          }),
        );
        const { result } = renderHook(() => useHeadlessBuy());

        await expect(
          result.current.getQuotes(baseQuotesParams),
        ).rejects.toMatchObject({
          message: 'unknown: (no message)',
          headlessBuyErrorCode: 'QUOTE_FAILED',
          details: expect.objectContaining({
            providerErrors: [
              {
                provider: 'unknown',
                message: undefined,
                code: undefined,
              },
            ],
          }),
        });
      });
    });

    describe('pre-quote static bounds check (Suggestion #2)', () => {
      it.each([
        ['amount < min', 5],
        ['amount > max', 999999],
      ])(
        'short-circuits with LIMIT_EXCEEDED when %s',
        async (_name, amount) => {
          useControllerValue({
            providers: buildProvidersWithBounds(transakEurBounds),
            userRegion: regionWithCurrency('EUR'),
          });
          const { result } = renderHook(() => useHeadlessBuy());
          await expect(
            result.current.getQuotes({ ...baseQuotesParams, amount }),
          ).rejects.toMatchObject({
            headlessBuyErrorCode: 'LIMIT_EXCEEDED',
            details: expect.objectContaining({
              amount,
              currency: 'EUR',
              source: 'static-bounds',
              rejections: [
                expect.objectContaining({
                  provider: transakProvider,
                  paymentMethodId: cardPaymentMethod,
                  minAmount: 10,
                  maxAmount: 5000,
                }),
              ],
            }),
          });
          expect(mockGetQuotesRaw).not.toHaveBeenCalled();
        },
      );

      it('routes the static rejection through an active session', async () => {
        useControllerValue({
          providers: buildProvidersWithBounds(transakEurBounds),
          userRegion: regionWithCurrency('EUR'),
        });
        const { callbacks, result, sessionId } = startActiveSession();
        await expect(
          act(async () => {
            await result.current.getQuotes(baseQuotesParams);
          }),
        ).rejects.toMatchObject({ headlessBuyErrorCode: 'LIMIT_EXCEEDED' });
        expect(callbacks.onError).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'LIMIT_EXCEEDED' }),
        );
        expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
        expect(sessionId).toBeDefined();
        expect(getSession(sessionId)).toBeUndefined();
      });

      it.each([
        [
          'at least one provider accepts',
          {
            providers: buildProvidersWithBounds([
              ...transakEurBounds,
              {
                id: moonpayProvider,
                currency: 'EUR',
                paymentMethodId: cardPaymentMethod,
                minAmount: 1,
                maxAmount: 100,
              },
            ]),
            params: { providerIds: [transakProvider, moonpayProvider] },
            response: quoteResponse({
              success: [{ provider: 'moonpay' }],
              sorted: [{ provider: 'moonpay' }],
            }),
          },
        ],
        [
          'bounds are unknown for a catalog provider',
          {
            providers: [
              {
                id: transakProvider,
                name: 'Transak',
                limits: { fiat: {} },
              } as unknown as Provider,
            ],
            response: quoteResponse({ success: [{ provider: 'transak' }] }),
          },
        ],
        ['the provider catalog is empty', { providers: [] }],
        [
          'a requested provider is missing from a non-empty catalog',
          {
            providers: buildProvidersWithBounds([
              {
                id: moonpayProvider,
                currency: 'EUR',
                paymentMethodId: cardPaymentMethod,
                minAmount: 10,
                maxAmount: 5000,
              },
            ]),
            params: { providerIds: ['/providers/unknown'] },
          },
        ],
        ['providerIds is omitted', { params: { providerIds: undefined } }],
        [
          'currency cannot be resolved',
          { userRegion: regionWithCurrency(), params: { amount: 5 } },
        ],
        ['amount is 0', { params: { amount: 0 } }],
        ['amount is NaN', { params: { amount: Number.NaN } }],
        [
          'one provider has a known-accept payment method',
          {
            providers: buildProvidersWithBounds([
              ...transakEurBounds,
              {
                id: transakProvider,
                currency: 'EUR',
                paymentMethodId: bankPaymentMethod,
                minAmount: 1,
                maxAmount: 5000,
              },
            ]),
            params: {
              paymentMethodIds: [cardPaymentMethod, bankPaymentMethod],
            },
            response: quoteResponse({ success: [{ provider: 'transak' }] }),
          },
        ],
        ['paymentMethodIds is empty', { params: { paymentMethodIds: [] } }],
        [
          'provider.limits is undefined',
          {
            providers: [
              { id: transakProvider, name: 'Transak' } as unknown as Provider,
            ],
          },
        ],
      ])('falls through to the network when %s', async (_name, scenario) => {
        await expectNetworkPassThrough(scenario);
      });

      it('honors an explicit params.currency override', async () => {
        useControllerValue({
          providers: buildProvidersWithBounds([
            {
              id: transakProvider,
              currency: 'USD',
              paymentMethodId: cardPaymentMethod,
              minAmount: 10,
              maxAmount: 5000,
            },
          ]),
          userRegion: regionWithCurrency(),
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
        expect(mockGetQuotesRaw).not.toHaveBeenCalled();
      });

      it('falls through when the provider catalog is undefined', async () => {
        useControllerValue({
          providers: undefined,
          userRegion: regionWithCurrency('EUR'),
        });
        mockGetQuotesRaw.mockResolvedValueOnce(emptyQuotesResponse);
        const { result } = renderHook(() => useHeadlessBuy());

        await expect(result.current.getQuotes(baseQuotesParams)).resolves.toBe(
          emptyQuotesResponse,
        );
        expect(mockGetQuotesRaw).toHaveBeenCalled();
      });

      it('treats exact min/max amounts as in-bounds', async () => {
        useControllerValue({
          providers: buildProvidersWithBounds(transakEurBounds),
          userRegion: regionWithCurrency('EUR'),
        });
        const response = quoteResponse();
        mockGetQuotesRaw.mockResolvedValue(response);
        const { result } = renderHook(() => useHeadlessBuy());
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 10 }),
        ).resolves.toBe(response);
        await expect(
          result.current.getQuotes({ ...baseQuotesParams, amount: 5000 }),
        ).resolves.toBe(response);
        expect(mockGetQuotesRaw).toHaveBeenCalledTimes(2);
      });

      it('exports getProviderBuyLimit from the public headless barrel', () => {
        const headless = jest.requireActual('./');
        expect(typeof headless.getProviderBuyLimit).toBe('function');
        expect(
          headless.getProviderBuyLimit(
            {
              limits: {
                fiat: { eur: { card: { minAmount: 10, maxAmount: 5000 } } },
              },
            },
            'EUR',
            'card',
          ),
        ).toEqual({ minAmount: 10, maxAmount: 5000 });
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

    it('seeds payment method as null when the payment catalog is missing', () => {
      const setSelectedPaymentMethod = jest.fn();
      (useRampsController as jest.Mock).mockReturnValue({
        ...baseControllerValue,
        paymentMethods: undefined,
        setSelectedPaymentMethod,
      });
      const { result } = renderHook(() => useHeadlessBuy());

      act(() => {
        result.current.startHeadlessBuy(baseStartParams, buildCallbacks());
      });

      expect(setSelectedPaymentMethod).toHaveBeenCalledWith(null);
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
      expect(mockNavigate).toHaveBeenCalledWith('RampHeadlessEntry', {
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
