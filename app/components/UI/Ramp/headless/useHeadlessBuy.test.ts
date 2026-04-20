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
import useRampsController from '../hooks/useRampsController';

const mockGetQuotesRaw = jest.fn();
const mockGetOrderById = jest.fn();
const mockResolveAccount = jest.fn();

jest.mock('../hooks/useRampsController', () => jest.fn());
jest.mock('../utils/getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: () => 'https://callback.metamask.io',
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
  { id: 'provider-2', name: 'Provider Two' },
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
});
