import { RootState } from '../../reducers';
import {
  RampsControllerState,
  UserRegion,
  type Provider,
  type Country,
  type PaymentMethod,
} from '@metamask/ramps-controller';
import {
  selectUserRegion,
  selectProviders,
  selectTokens,
  selectCountries,
  selectPaymentMethods,
  selectRampsControllerState,
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

type RampsControllerStateOverride = Partial<RampsControllerState>;

const createMockState = (
  rampsController: RampsControllerStateOverride = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        RampsController: {
          userRegion: null,
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
    it('returns user region when userRegion is set', () => {
      const state = createMockState({
        userRegion: mockUserRegion,
      });

      const result = selectUserRegion(state);
      expect(result).toEqual(mockUserRegion);
    });

    it('returns null when userRegion is null', () => {
      const state = createMockState({
        userRegion: null,
      });

      const result = selectUserRegion(state);
      expect(result).toBeNull();
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
