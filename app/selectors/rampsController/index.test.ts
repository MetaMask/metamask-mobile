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
  selectProviders,
  selectTokens,
  selectSelectedToken,
  selectCountries,
  selectCountriesRequest,
  selectTokensRequest,
  selectProvidersRequest,
  selectPaymentMethods,
  selectPaymentMethodsRequest,
  selectRampsControllerState,
  selectQuotes,
} from './index';

const createDefaultResourceState = <TData, TSelected = null>(
  data: TData,
  selected: TSelected = null as TSelected,
) => ({
  data,
  selected,
  isLoading: false,
  error: null,
});

const createMockState = (
  rampsController: Partial<RampsControllerState> = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        RampsController: {
          userRegion: createDefaultResourceState<UserRegion | null>(null),
          countries: createDefaultResourceState<Country[]>([]),
          providers: createDefaultResourceState<Provider[], Provider | null>(
            [],
            null,
          ),
          tokens: createDefaultResourceState(null, null),
          paymentMethods: createDefaultResourceState<
            PaymentMethod[],
            PaymentMethod | null
          >([], null),
          quotes: createDefaultResourceState(null),
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
    it('returns user region resource state', () => {
      const state = createMockState({
        userRegion: {
          data: mockUserRegion,
          selected: null,
          isLoading: false,
          error: null,
        },
      });

      const result = selectUserRegion(state);
      expect(result.data).toEqual(mockUserRegion);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('returns loading state when isLoading is true', () => {
      const state = createMockState({
        userRegion: {
          data: null,
          selected: null,
          isLoading: true,
          error: null,
        },
      });

      const result = selectUserRegion(state);
      expect(result.isLoading).toBe(true);
    });

    it('returns error when present', () => {
      const state = createMockState({
        userRegion: {
          data: null,
          selected: null,
          isLoading: false,
          error: 'Network error',
        },
      });

      const result = selectUserRegion(state);
      expect(result.error).toBe('Network error');
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

  describe('selectProviders', () => {
    it('returns providers resource state', () => {
      const state = createMockState({
        providers: {
          data: [mockProvider],
          selected: mockProvider,
          isLoading: false,
          error: null,
        },
      });

      const result = selectProviders(state);
      expect(result.data).toEqual([mockProvider]);
      expect(result.selected).toEqual(mockProvider);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('returns empty array when providers data is empty', () => {
      const state = createMockState();

      const result = selectProviders(state);
      expect(result.data).toEqual([]);
    });
  });

  describe('selectTokens', () => {
    it('returns tokens resource state', () => {
      const state = createMockState({
        tokens: {
          data: mockTokens,
          selected: mockToken,
          isLoading: false,
          error: null,
        },
      });

      const result = selectTokens(state);
      expect(result.data).toEqual(mockTokens);
      expect(result.selected).toEqual(mockToken);
    });

    it('returns null data when tokens is null', () => {
      const state = createMockState();

      const result = selectTokens(state);
      expect(result.data).toBeNull();
    });
  });

  describe('selectCountries', () => {
    it('returns countries resource state', () => {
      const state = createMockState({
        countries: {
          data: mockCountries,
          selected: null,
          isLoading: false,
          error: null,
        },
      });

      const result = selectCountries(state);
      expect(result.data).toEqual(mockCountries);
    });

    it('returns empty array when countries are not available', () => {
      const state = createMockState();

      const result = selectCountries(state);
      expect(result.data).toEqual([]);
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
  });

  describe('selectPaymentMethods', () => {
    it('returns payment methods resource state', () => {
      const state = createMockState({
        paymentMethods: {
          data: mockPaymentMethods,
          selected: mockPaymentMethod,
          isLoading: false,
          error: null,
        },
      });

      const result = selectPaymentMethods(state);
      expect(result.data).toEqual(mockPaymentMethods);
      expect(result.selected).toEqual(mockPaymentMethod);
    });

    it('returns empty array when payment methods are not available', () => {
      const state = createMockState();

      const result = selectPaymentMethods(state);
      expect(result.data).toEqual([]);
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
  });

  describe('selectQuotes', () => {
    it('returns quotes resource state', () => {
      const mockQuotes = {
        success: [],
        sorted: [],
        error: [],
        customActions: [],
      };
      const state = createMockState({
        quotes: {
          data: mockQuotes,
          selected: null,
          isLoading: false,
          error: null,
        },
      });

      const result = selectQuotes(state);
      expect(result.data).toEqual(mockQuotes);
    });

    it('returns null data when quotes are not available', () => {
      const state = createMockState();

      const result = selectQuotes(state);
      expect(result.data).toBeNull();
    });
  });

  describe('selectRampsControllerState', () => {
    it('returns RampsController state', () => {
      const state = createMockState();

      expect(selectRampsControllerState(state)).toBeDefined();
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
});
