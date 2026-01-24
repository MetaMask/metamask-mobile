import { RootState } from '../../reducers';
import {
  RampsControllerState,
  RequestStatus,
  UserRegion,
  type Provider,
  type Country,
} from '@metamask/ramps-controller';
import {
  selectUserRegion,
  selectUserRegionRequest,
  selectPreferredProvider,
  selectProviders,
  selectTokens,
  selectPaymentMethods,
  selectCountriesRequest,
  selectTokensRequest,
  selectProvidersRequest,
  selectPaymentMethodsRequest,
  selectRampsControllerState,
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

const mockTokens = {
  topTokens: [
    {
      assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
      chainId: 'eip155:1',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      iconUrl: 'https://example.com/eth-icon.png',
      tokenSupported: true,
    },
  ],
  allTokens: [
    {
      assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
      chainId: 'eip155:1',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      iconUrl: 'https://example.com/eth-icon.png',
      tokenSupported: true,
    },
  ],
};

const mockPaymentMethods = [
  {
    id: '/payments/debit-credit-card',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer: "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
];

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
          'updateUserRegion:[]': {
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
          'updateUserRegion:[]': {
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
          'updateUserRegion:[]': {
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

  describe('selectPreferredProvider', () => {
    it('returns preferred provider from state', () => {
      const state = createMockState({ preferredProvider: mockProvider });

      expect(selectPreferredProvider(state)).toEqual(mockProvider);
    });

    it('returns null when preferred provider is null', () => {
      const state = createMockState({ preferredProvider: null });

      expect(selectPreferredProvider(state)).toBeNull();
    });

    it('returns null when RampsController state is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectPreferredProvider(state)).toBeNull();
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

  describe('selectPaymentMethods', () => {
    it('returns payment methods from state', () => {
      const state = createMockState({ paymentMethods: mockPaymentMethods });

      expect(selectPaymentMethods(state)).toEqual(mockPaymentMethods);
    });

    it('returns empty array when paymentMethods is empty', () => {
      const state = createMockState({ paymentMethods: [] });

      expect(selectPaymentMethods(state)).toEqual([]);
    });

    it('returns empty array when paymentMethods is undefined', () => {
      const state = createMockState();

      expect(selectPaymentMethods(state)).toEqual([]);
    });
  });

  describe('selectCountriesRequest', () => {
    it('returns request state for countries', () => {
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

      const result = selectCountriesRequest()(state);

      expect(result).toEqual({
        data: mockCountries,
        isFetching: false,
        error: null,
      });
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectCountriesRequest()(state);

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

  describe('selectPaymentMethodsRequest', () => {
    it('returns request state for context', () => {
      const state = createMockState({
        requests: {
          'getPaymentMethods:["us-ca","usd","eip155:1/slip44:60","/providers/transak"]':
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
        'eip155:1/slip44:60',
        '/providers/transak',
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
          'getPaymentMethods:["us-ca","usd","eip155:1/slip44:60","/providers/transak"]':
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
        'eip155:1/slip44:60',
        '/providers/transak',
      )(state);

      expect(result.data).toEqual({ payments: mockPaymentMethods });
    });

    it('returns isFetching true when request is loading', () => {
      const state = createMockState({
        requests: {
          'getPaymentMethods:["us-ca","usd","eip155:1/slip44:60","/providers/transak"]':
            {
              status: RequestStatus.LOADING,
              data: null,
              error: null,
              timestamp: Date.now(),
              lastFetchedAt: Date.now(),
            },
        },
      });

      const result = selectPaymentMethodsRequest(
        'us-ca',
        'usd',
        'eip155:1/slip44:60',
        '/providers/transak',
      )(state);

      expect(result.isFetching).toBe(true);
    });

    it('returns error when request failed', () => {
      const state = createMockState({
        requests: {
          'getPaymentMethods:["us-ca","usd","eip155:1/slip44:60","/providers/transak"]':
            {
              status: RequestStatus.ERROR,
              data: null,
              error: 'Network error',
              timestamp: Date.now(),
              lastFetchedAt: Date.now(),
            },
        },
      });

      const result = selectPaymentMethodsRequest(
        'us-ca',
        'usd',
        'eip155:1/slip44:60',
        '/providers/transak',
      )(state);

      expect(result.error).toBe('Network error');
    });

    it('returns default state when request does not exist', () => {
      const state = createMockState();

      const result = selectPaymentMethodsRequest(
        'us-ca',
        'usd',
        'eip155:1/slip44:60',
        '/providers/transak',
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
        preferredProvider: mockProvider,
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
});
