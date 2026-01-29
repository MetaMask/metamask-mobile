import { RootState } from '../../reducers';
import {
  RampsControllerState,
  RequestStatus,
  UserRegion,
  type Provider,
  type Country,
  type PaymentMethod,
} from '@metamask/ramps-controller';
import {
  selectUserRegion,
  selectUserRegionRequest,
  selectSelectedProvider,
  selectProviders,
  selectTokens,
  selectSelectedToken,
  selectCountries,
  selectCountriesRequest,
  selectTokensRequest,
  selectProvidersRequest,
  selectPaymentMethods,
  selectSelectedPaymentMethod,
  selectPaymentMethodsRequest,
  selectRampsControllerState,
  selectUserRegionLoading,
  selectUserRegionError,
  selectCountriesLoading,
  selectCountriesError,
  selectProvidersLoading,
  selectProvidersError,
  selectTokensLoading,
  selectTokensError,
  selectPaymentMethodsLoading,
  selectPaymentMethodsError,
} from './index';

const createMockState = (
  rampsController: Partial<RampsControllerState> = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        RampsController: {
          userRegion: null,
          requests: {},
          ...rampsController,
        },
      },
    },
  }) as unknown as RootState;

const mockUserRegion: UserRegion = {
  country: {
    isoCode: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'USD',
    supported: { buy: true, sell: true },
  },
  state: { stateId: 'CA', name: 'California' },
  regionCode: 'us-ca',
};

const mockProvider: Provider = {
  id: 'test-provider',
  name: 'Test Provider',
  environmentType: 'PRODUCTION',
  description: 'Test Provider Description',
  hqAddress: '123 Test St, Test City, TC 12345',
  links: [],
  logos: {
    light: 'https://example.com/logo-light.png',
    dark: 'https://example.com/logo-dark.png',
    height: 24,
    width: 79,
  },
};

const mockCountries: Country[] = [
  {
    isoCode: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'USD',
    supported: { buy: true, sell: true },
  },
];

const mockToken = {
  assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl: 'https://example.com/eth-icon.png',
  tokenSupported: true,
};

const mockTokens = {
  topTokens: [mockToken],
  allTokens: [mockToken],
};

const mockPaymentMethod: PaymentMethod = {
  id: '/payments/debit-credit-card',
  paymentType: 'debit-credit-card',
  name: 'Debit/Credit Card',
  score: 100,
  icon: 'card',
};

const mockPaymentMethods: PaymentMethod[] = [mockPaymentMethod];

describe('RampsController Selectors', () => {
  describe('selectUserRegion', () => {
    it('returns user region from state', () => {
      const state = createMockState({ userRegion: mockUserRegion });

      expect(selectUserRegion(state)).toEqual(mockUserRegion);
    });

    it('returns null when user region is null', () => {
      const state = createMockState({ userRegion: null });

      expect(selectUserRegion(state)).toBeNull();
    });
  });

  describe('selectUserRegionRequest', () => {
    it('returns request state with data, isFetching, and error', () => {
      const state = createMockState({
        requests: {
          'init:[]': {
            status: RequestStatus.SUCCESS,
            data: mockUserRegion,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectUserRegionRequest(state);

      expect(result).toEqual({
        data: mockUserRegion,
        isFetching: false,
        error: null,
      });
    });

    it('returns isFetching true when request is loading', () => {
      const state = createMockState({
        requests: {
          'init:[]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectUserRegionRequest(state);

      expect(result.isFetching).toBe(true);
    });

    it('returns error when request failed', () => {
      const state = createMockState({
        requests: {
          'init:[]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectUserRegionRequest(state);

      expect(result.error).toBe('Network error');
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectUserRegionRequest(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: null,
      });
    });
  });

  describe('selectSelectedProvider', () => {
    it('returns selected provider from state', () => {
      const state = createMockState({ selectedProvider: mockProvider });

      expect(selectSelectedProvider(state)).toEqual(mockProvider);
    });

    it('returns null when selected provider is null', () => {
      const state = createMockState({ selectedProvider: null });

      expect(selectSelectedProvider(state)).toBeNull();
    });

    it('returns null when RampsController state is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectSelectedProvider(state)).toBeNull();
    });
  });

  describe('selectProviders', () => {
    it('returns providers from state', () => {
      const state = createMockState({ providers: [mockProvider] });

      expect(selectProviders(state)).toEqual([mockProvider]);
    });

    it('returns empty array when providers is null', () => {
      const state = createMockState({ providers: [] });

      expect(selectProviders(state)).toEqual([]);
    });

    it('returns empty array when providers is undefined', () => {
      const state = createMockState();

      expect(selectProviders(state)).toEqual([]);
    });
  });

  describe('selectTokens', () => {
    it('returns tokens from state', () => {
      const state = createMockState({ tokens: mockTokens });

      expect(selectTokens(state)).toEqual(mockTokens);
    });

    it('returns null when tokens is null', () => {
      const state = createMockState({ tokens: null });

      expect(selectTokens(state)).toBeNull();
    });

    it('returns null when tokens is undefined', () => {
      const state = createMockState();

      expect(selectTokens(state)).toBeNull();
    });
  });

  describe('selectSelectedToken', () => {
    it('returns selected token from state', () => {
      const state = createMockState({ selectedToken: mockToken });

      expect(selectSelectedToken(state)).toEqual(mockToken);
    });

    it('returns null when selected token is null', () => {
      const state = createMockState({ selectedToken: null });

      expect(selectSelectedToken(state)).toBeNull();
    });

    it('returns null when RampsController state is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectSelectedToken(state)).toBeNull();
    });
  });

  describe('selectCountries', () => {
    it('returns countries from state', () => {
      const state = createMockState({ countries: mockCountries });

      expect(selectCountries(state)).toEqual(mockCountries);
    });

    it('returns empty array when countries are not available', () => {
      const state = createMockState();

      expect(selectCountries(state)).toEqual([]);
    });
  });

  describe('selectCountriesRequest', () => {
    it('returns request state', () => {
      const state = createMockState({
        requests: {
          'getCountries:[]': {
            status: RequestStatus.SUCCESS,
            data: mockCountries,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectCountriesRequest(state);

      expect(result).toEqual({
        data: mockCountries,
        isFetching: false,
        error: null,
      });
    });

    it('returns loading state when request is in progress', () => {
      const state = createMockState({
        requests: {
          'getCountries:[]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectCountriesRequest(state);

      expect(result).toEqual({
        data: null,
        isFetching: true,
        error: null,
      });
    });

    it('returns error state when request fails', () => {
      const state = createMockState({
        requests: {
          'getCountries:[]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectCountriesRequest(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: 'Network error',
      });
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectCountriesRequest(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: null,
      });
    });
  });

  describe('selectTokensRequest', () => {
    it('returns request state for region and action', () => {
      const state = createMockState({
        requests: {
          'getTokens:["us-ca","buy"]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectTokensRequest('us-ca', 'buy')(state);

      expect(result).toEqual({
        data: mockTokens,
        isFetching: false,
        error: null,
      });
    });

    it('normalizes region to lowercase and trims', () => {
      const state = createMockState({
        requests: {
          'getTokens:["us-ca","buy"]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectTokensRequest('  US-CA  ', 'buy')(state);

      expect(result.data).toEqual(mockTokens);
    });

    it('defaults to buy action when not provided', () => {
      const state = createMockState({
        requests: {
          'getTokens:["us-ca","buy"]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectTokensRequest('us-ca')(state);

      expect(result.data).toEqual(mockTokens);
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectTokensRequest('us-ca', 'buy')(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: null,
      });
    });
  });

  describe('selectProvidersRequest', () => {
    it('returns request state for region', () => {
      const state = createMockState({
        requests: {
          'getProviders:["us-ca",null,null,null,null]': {
            status: RequestStatus.SUCCESS,
            data: { providers: [mockProvider] },
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectProvidersRequest('us-ca')(state);

      expect(result).toEqual({
        data: { providers: [mockProvider] },
        isFetching: false,
        error: null,
      });
    });

    it('normalizes region to lowercase and trims', () => {
      const state = createMockState({
        requests: {
          'getProviders:["us-ca",null,null,null,null]': {
            status: RequestStatus.SUCCESS,
            data: { providers: [mockProvider] },
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectProvidersRequest('  US-CA  ')(state);

      expect(result.data).toEqual({ providers: [mockProvider] });
    });

    it('includes filter options in request key', () => {
      const state = createMockState({
        requests: {
          'getProviders:["us-ca","provider-1","ETH","USD",null]': {
            status: RequestStatus.SUCCESS,
            data: { providers: [mockProvider] },
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const result = selectProvidersRequest('us-ca', {
        provider: 'provider-1',
        crypto: 'ETH',
        fiat: 'USD',
      })(state);

      expect(result.data).toEqual({ providers: [mockProvider] });
    });

    it('handles array filter options', () => {
      const state = createMockState({
        requests: {
          'getProviders:["us-ca",["provider-1","provider-2"],["ETH","BTC"],"USD",null]':
            {
              status: RequestStatus.SUCCESS,
              data: { providers: [mockProvider] },
              error: null,
              timestamp: Date.now(),
              lastFetchedAt: Date.now(),
            },
        },
      });

      const result = selectProvidersRequest('us-ca', {
        provider: ['provider-1', 'provider-2'],
        crypto: ['ETH', 'BTC'],
        fiat: 'USD',
      })(state);

      expect(result.isFetching).toBe(false);
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ providers: [mockProvider] });
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectProvidersRequest('us-ca')(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: null,
      });
    });
  });

  describe('selectPaymentMethods', () => {
    it('returns payment methods from state', () => {
      const state = createMockState({ paymentMethods: mockPaymentMethods });

      expect(selectPaymentMethods(state)).toEqual(mockPaymentMethods);
    });

    it('returns empty array when payment methods are not available', () => {
      const state = createMockState();

      expect(selectPaymentMethods(state)).toEqual([]);
    });
  });

  describe('selectSelectedPaymentMethod', () => {
    it('returns selected payment method from state', () => {
      const state = createMockState({
        selectedPaymentMethod: mockPaymentMethod,
      });

      expect(selectSelectedPaymentMethod(state)).toEqual(mockPaymentMethod);
    });

    it('returns null when selected payment method is null', () => {
      const state = createMockState({ selectedPaymentMethod: null });

      expect(selectSelectedPaymentMethod(state)).toBeNull();
    });

    it('returns null when RampsController state is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectSelectedPaymentMethod(state)).toBeNull();
    });
  });

  describe('selectPaymentMethodsRequest', () => {
    it('returns request state for region, fiat, assetId, and provider', () => {
      const state = createMockState({
        requests: {
          'getPaymentMethods:["us-ca","usd","eip155:1/erc20:0x123","provider-1"]':
            {
              status: RequestStatus.SUCCESS,
              data: { payments: mockPaymentMethods },
              error: null,
              timestamp: Date.now(),
              lastFetchedAt: Date.now(),
            },
        },
      });

      const result = selectPaymentMethodsRequest(
        'us-ca',
        'usd',
        'eip155:1/erc20:0x123',
        'provider-1',
      )(state);

      expect(result).toEqual({
        data: { payments: mockPaymentMethods },
        isFetching: false,
        error: null,
      });
    });

    it('normalizes region and fiat to lowercase and trims', () => {
      const state = createMockState({
        requests: {
          'getPaymentMethods:["us-ca","usd","eip155:1/erc20:0x123","provider-1"]':
            {
              status: RequestStatus.SUCCESS,
              data: { payments: mockPaymentMethods },
              error: null,
              timestamp: Date.now(),
              lastFetchedAt: Date.now(),
            },
        },
      });

      const result = selectPaymentMethodsRequest(
        '  US-CA  ',
        '  USD  ',
        'eip155:1/erc20:0x123',
        'provider-1',
      )(state);

      expect(result.data).toEqual({ payments: mockPaymentMethods });
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectPaymentMethodsRequest(
        'us-ca',
        'usd',
        'eip155:1/erc20:0x123',
        'provider-1',
      )(state);

      expect(result).toEqual({
        data: null,
        isFetching: false,
        error: null,
      });
    });
  });

  describe('selectRampsControllerState', () => {
    it('returns RampsController state', () => {
      const rampsState: Partial<RampsControllerState> = {
        userRegion: mockUserRegion,
        selectedProvider: mockProvider,
        providers: [mockProvider],
        tokens: mockTokens,
        requests: {},
      };
      const state = createMockState(rampsState);

      expect(selectRampsControllerState(state)).toEqual(rampsState);
    });

    it('returns undefined when RampsController is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectRampsControllerState(state)).toBeUndefined();
    });
  });

  describe('selectUserRegionLoading', () => {
    it('returns userRegionLoading from state', () => {
      const state = createMockState({ userRegionLoading: true });

      expect(selectUserRegionLoading(state)).toBe(true);
    });

    it('returns false when userRegionLoading is not set', () => {
      const state = createMockState();

      expect(selectUserRegionLoading(state)).toBe(false);
    });
  });

  describe('selectUserRegionError', () => {
    it('returns userRegionError from state', () => {
      const state = createMockState({ userRegionError: 'Network error' });

      expect(selectUserRegionError(state)).toBe('Network error');
    });

    it('returns null when userRegionError is not set', () => {
      const state = createMockState();

      expect(selectUserRegionError(state)).toBeNull();
    });
  });

  describe('selectCountriesLoading', () => {
    it('returns countriesLoading from state', () => {
      const state = createMockState({ countriesLoading: true });

      expect(selectCountriesLoading(state)).toBe(true);
    });

    it('returns false when countriesLoading is not set', () => {
      const state = createMockState();

      expect(selectCountriesLoading(state)).toBe(false);
    });
  });

  describe('selectCountriesError', () => {
    it('returns countriesError from state', () => {
      const state = createMockState({ countriesError: 'Network error' });

      expect(selectCountriesError(state)).toBe('Network error');
    });

    it('returns null when countriesError is not set', () => {
      const state = createMockState();

      expect(selectCountriesError(state)).toBeNull();
    });
  });

  describe('selectProvidersLoading', () => {
    it('returns providersLoading from state', () => {
      const state = createMockState({ providersLoading: true });

      expect(selectProvidersLoading(state)).toBe(true);
    });

    it('returns false when providersLoading is not set', () => {
      const state = createMockState();

      expect(selectProvidersLoading(state)).toBe(false);
    });
  });

  describe('selectProvidersError', () => {
    it('returns providersError from state', () => {
      const state = createMockState({ providersError: 'Network error' });

      expect(selectProvidersError(state)).toBe('Network error');
    });

    it('returns null when providersError is not set', () => {
      const state = createMockState();

      expect(selectProvidersError(state)).toBeNull();
    });
  });

  describe('selectTokensLoading', () => {
    it('returns tokensLoading from state', () => {
      const state = createMockState({ tokensLoading: true });

      expect(selectTokensLoading(state)).toBe(true);
    });

    it('returns false when tokensLoading is not set', () => {
      const state = createMockState();

      expect(selectTokensLoading(state)).toBe(false);
    });
  });

  describe('selectTokensError', () => {
    it('returns tokensError from state', () => {
      const state = createMockState({ tokensError: 'Network error' });

      expect(selectTokensError(state)).toBe('Network error');
    });

    it('returns null when tokensError is not set', () => {
      const state = createMockState();

      expect(selectTokensError(state)).toBeNull();
    });
  });

  describe('selectPaymentMethodsLoading', () => {
    it('returns paymentMethodsLoading from state', () => {
      const state = createMockState({ paymentMethodsLoading: true });

      expect(selectPaymentMethodsLoading(state)).toBe(true);
    });

    it('returns false when paymentMethodsLoading is not set', () => {
      const state = createMockState();

      expect(selectPaymentMethodsLoading(state)).toBe(false);
    });
  });

  describe('selectPaymentMethodsError', () => {
    it('returns paymentMethodsError from state', () => {
      const state = createMockState({ paymentMethodsError: 'Network error' });

      expect(selectPaymentMethodsError(state)).toBe('Network error');
    });

    it('returns null when paymentMethodsError is not set', () => {
      const state = createMockState();

      expect(selectPaymentMethodsError(state)).toBeNull();
    });
  });
});
