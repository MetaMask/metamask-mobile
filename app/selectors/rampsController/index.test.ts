import { RootState } from '../../reducers';
import {
  RampsControllerState,
  UserRegion,
  type Provider,
  type Country,
  type PaymentMethod,
} from '@metamask/ramps-controller';
import { AccountGroupType } from '@metamask/account-api';
import { AccountId } from '@metamask/accounts-controller';
import { TrxAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';
import { mockSolanaAddress } from '../../util/test/keyringControllerTestUtils';
import {
  selectUserRegion,
  selectProviders,
  selectTokens,
  selectCountries,
  selectPaymentMethods,
  selectRampsControllerState,
  selectRampsOrders,
  selectRampsOrdersForSelectedAccountGroup,
  selectTransak,
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
  extraBackgroundState: Record<string, unknown> = {},
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
          requests: {},
          nativeProviders: {
            transak: {
              isAuthenticated: false,
              userDetails: createDefaultResourceState(null),
              buyQuote: createDefaultResourceState(null),
              kycRequirement: createDefaultResourceState(null),
            },
          },
          ...rampsController,
        },
        KeyringController: {
          keyrings: [],
        },
        ...extraBackgroundState,
      },
    },
  }) as unknown as RootState;

const WALLET_ID = 'keyring:ramps-selector-test' as const;
const GROUP_ID = `${WALLET_ID}/ethereum` as const;

function createStateWithSelectedAccountGroup(
  rampsController: RampsControllerStateOverride,
  internalAccount: InternalAccount,
  accountId: string,
): RootState {
  return createMockState(rampsController, {
    AccountTreeController: {
      accountTree: {
        wallets: {
          [WALLET_ID]: {
            id: WALLET_ID,
            metadata: { name: 'Test wallet' },
            groups: {
              [GROUP_ID]: {
                id: GROUP_ID,
                type: AccountGroupType.SingleAccount,
                accounts: [accountId],
                metadata: { name: 'Test Group' },
              },
            },
          },
        },
        selectedAccountGroup: GROUP_ID,
      },
    },
    RemoteFeatureFlagController: {
      remoteFeatureFlags: {
        enableMultichainAccounts: {
          enabled: true,
          featureVersion: '1',
          minimumVersion: '1.0.0',
        },
      },
    },
    AccountsController: {
      internalAccounts: {
        accounts: {
          [accountId]: internalAccount,
        },
        selectedAccount: accountId,
      },
    },
    KeyringController: {
      keyrings: [],
    },
  });
}

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

  describe('selectRampsOrders', () => {
    it('returns orders when they exist', () => {
      const mockOrders = [
        {
          providerOrderId: 'order-1',
          status: 'COMPLETED',
          createdAt: 1000,
        },
        {
          providerOrderId: 'order-2',
          status: 'PENDING',
          createdAt: 2000,
        },
      ];
      const state = createMockState({
        orders: mockOrders,
      } as never);

      const result = selectRampsOrders(state);
      expect(result).toEqual(mockOrders);
    });

    it('returns empty array when orders are undefined', () => {
      const state = createMockState();
      const result = selectRampsOrders(state);
      expect(result).toEqual([]);
    });

    it('returns empty array when RampsController is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      const result = selectRampsOrders(state);
      expect(result).toEqual([]);
    });
  });

  describe('selectRampsOrdersForSelectedAccountGroup', () => {
    const accountId = 'account-ramps-1';
    const walletAddrLower = '0x2990079bcdee240329a520d2444386fc119da21a';
    const internalAccount = {
      ...createMockInternalAccount(walletAddrLower, 'Account 1'),
      id: accountId,
    };

    it('returns empty array when no selected account group addresses', () => {
      const mockOrders = [
        {
          providerOrderId: 'order-1',
          walletAddress: walletAddrLower,
          status: 'COMPLETED',
          createdAt: 1000,
        },
      ];
      const state = createMockState({
        orders: mockOrders,
      } as never);

      expect(selectRampsOrdersForSelectedAccountGroup(state)).toEqual([]);
    });

    it('keeps orders whose walletAddress matches a selected group address (case-insensitive for EVM)', () => {
      const mockOrders = [
        {
          providerOrderId: 'order-match',
          walletAddress: '0x2990079BCDEE240329A520D2444386FC119DA21A',
          status: 'COMPLETED',
          createdAt: 1000,
        },
        {
          providerOrderId: 'order-other',
          walletAddress: '0x0000000000000000000000000000000000000001',
          status: 'COMPLETED',
          createdAt: 2000,
        },
      ];
      const state = createStateWithSelectedAccountGroup(
        { orders: mockOrders } as never,
        internalAccount,
        accountId,
      );

      const result = selectRampsOrdersForSelectedAccountGroup(state);
      expect(result).toEqual([mockOrders[0]]);
    });

    it('excludes orders with missing walletAddress', () => {
      const mockOrders = [
        {
          providerOrderId: 'order-no-wallet',
          status: 'COMPLETED',
          createdAt: 1000,
        },
      ];
      const state = createStateWithSelectedAccountGroup(
        { orders: mockOrders } as never,
        internalAccount,
        accountId,
      );

      expect(selectRampsOrdersForSelectedAccountGroup(state)).toEqual([]);
    });

    it('keeps orders whose walletAddress matches a Solana account in the selected group', () => {
      const solanaAccountId = 'account-ramps-solana' as AccountId;
      const otherSolanaAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      const solanaInternalAccount: InternalAccount = {
        id: solanaAccountId,
        address: mockSolanaAddress,
        type: 'solana:dataAccount' as InternalAccount['type'],
        options: {},
        methods: [],
        scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        metadata: {
          name: 'Solana Account',
          importTime: Date.now(),
          keyring: {
            type: 'Snap Keyring',
          },
        },
      };
      const mockOrders = [
        {
          providerOrderId: 'order-sol-match',
          walletAddress: mockSolanaAddress,
          status: 'COMPLETED',
          createdAt: 1000,
        },
        {
          providerOrderId: 'order-sol-other',
          walletAddress: otherSolanaAddress,
          status: 'COMPLETED',
          createdAt: 2000,
        },
      ];
      const state = createStateWithSelectedAccountGroup(
        { orders: mockOrders } as never,
        solanaInternalAccount,
        solanaAccountId,
      );

      expect(selectRampsOrdersForSelectedAccountGroup(state)).toEqual([
        mockOrders[0],
      ]);
    });

    it('keeps orders whose walletAddress matches a Bitcoin account in the selected group', () => {
      const bitcoinAccountId = 'account-ramps-bitcoin' as AccountId;
      const bitcoinAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const otherBitcoinAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
      const bitcoinInternalAccount: InternalAccount = {
        id: bitcoinAccountId,
        address: bitcoinAddress,
        type: 'bip122:p2wpkh' as InternalAccount['type'],
        options: {},
        methods: [],
        scopes: ['bip122:000000000019d6689c085ae165831e93'],
        metadata: {
          name: 'Bitcoin Account',
          importTime: Date.now(),
          keyring: {
            type: 'Snap Keyring',
          },
        },
      };
      const mockOrders = [
        {
          providerOrderId: 'order-btc-match',
          walletAddress: bitcoinAddress,
          status: 'COMPLETED',
          createdAt: 1000,
        },
        {
          providerOrderId: 'order-btc-other',
          walletAddress: otherBitcoinAddress,
          status: 'COMPLETED',
          createdAt: 2000,
        },
      ];
      const state = createStateWithSelectedAccountGroup(
        { orders: mockOrders } as never,
        bitcoinInternalAccount,
        bitcoinAccountId,
      );

      expect(selectRampsOrdersForSelectedAccountGroup(state)).toEqual([
        mockOrders[0],
      ]);
    });

    it('keeps orders whose walletAddress matches a Tron account in the selected group', () => {
      const tronAccountId = 'account-ramps-tron' as AccountId;
      const tronAddress = 'TXYZopYRdj2D9XRtbPoJZ1CuXLNaoEBgD';
      const otherTronAddress = 'TN3W4H6rK2ce4vX9YnFQHw8ENXNA9s8rPH';
      const tronInternalAccount: InternalAccount = {
        ...createMockInternalAccount(
          tronAddress,
          'Tron Account',
          KeyringTypes.snap,
          TrxAccountType.Eoa,
        ),
        id: tronAccountId,
      };
      const mockOrders = [
        {
          providerOrderId: 'order-tron-match',
          walletAddress: tronAddress,
          status: 'COMPLETED',
          createdAt: 1000,
        },
        {
          providerOrderId: 'order-tron-other',
          walletAddress: otherTronAddress,
          status: 'COMPLETED',
          createdAt: 2000,
        },
      ];
      const state = createStateWithSelectedAccountGroup(
        { orders: mockOrders } as never,
        tronInternalAccount,
        tronAccountId,
      );

      expect(selectRampsOrdersForSelectedAccountGroup(state)).toEqual([
        mockOrders[0],
      ]);
    });
  });

  describe('selectTransak', () => {
    it('returns transak state when nativeProviders.transak is set', () => {
      const mockTransakState = {
        isAuthenticated: true,
        userDetails: {
          data: { firstName: 'John', lastName: 'Doe' },
          isLoading: false,
          error: null,
        },
        buyQuote: {
          data: { quoteId: 'q1', fiatAmount: 100 },
          isLoading: false,
          error: null,
        },
        kycRequirement: {
          data: { status: 'APPROVED', kycType: 'SIMPLE' },
          isLoading: false,
          error: null,
        },
      };

      const state = createMockState({
        nativeProviders: {
          transak: mockTransakState,
        },
      } as never);

      const result = selectTransak(state);
      expect(result).toEqual(mockTransakState);
    });

    it('returns default transak state when nativeProviders is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RampsController: {
              userRegion: null,
              countries: createDefaultResourceState([]),
              providers: createDefaultResourceState([], null),
              tokens: createDefaultResourceState(null, null),
              paymentMethods: createDefaultResourceState([], null),
              requests: {},
            },
          },
        },
      } as unknown as RootState;

      const result = selectTransak(state);
      expect(result).toEqual({
        isAuthenticated: false,
        userDetails: createDefaultResourceState(null),
        buyQuote: createDefaultResourceState(null),
        kycRequirement: createDefaultResourceState(null),
      });
    });

    it('returns isAuthenticated true when user is authenticated', () => {
      const state = createMockState({
        nativeProviders: {
          transak: {
            isAuthenticated: true,
            userDetails: createDefaultResourceState(null),
            buyQuote: createDefaultResourceState(null),
            kycRequirement: createDefaultResourceState(null),
          },
        },
      } as never);

      const result = selectTransak(state);
      expect(result.isAuthenticated).toBe(true);
    });
  });
});
