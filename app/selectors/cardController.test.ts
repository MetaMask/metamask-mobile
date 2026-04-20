import { RootState } from '../reducers';
import {
  selectCardSelectedCountry,
  selectCardActiveProviderId,
  selectIsCardAuthenticated,
  selectCardholderAccounts,
  selectHasCardholderAccounts,
  selectIsCardholder,
  selectCardUserLocation,
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectCardPrimaryToken,
  selectCardAvailableTokens,
  selectCardFundingTokens,
  selectCardDelegationSettings,
} from './cardController';
import type { CardControllerState } from '../core/Engine/controllers/card-controller/types';
import {
  FundingAssetStatus,
  type CardHomeData,
} from '../core/Engine/controllers/card-controller/provider-types';
import { FundingStatus } from '../components/UI/Card/types';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { isEthAccount } from '../core/Multichain/utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';

jest.mock('./multichainAccounts/accounts');
jest.mock('../core/Multichain/utils');

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;
const mockIsEthAccount = isEthAccount as jest.MockedFunction<
  typeof isEthAccount
>;

const createMockRootState = (
  overrides: Partial<CardControllerState> = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        CardController: {
          selectedCountry: null,
          activeProviderId: null,
          isAuthenticated: false,
          cardholderAccounts: [],
          providerData: {},
          cardHomeData: null,
          cardHomeDataStatus: 'idle',
          ...overrides,
        },
      },
    },
  }) as unknown as RootState;

describe('CardController selectors', () => {
  describe('selectCardSelectedCountry', () => {
    it('returns null when no country is selected', () => {
      const state = createMockRootState();

      expect(selectCardSelectedCountry(state)).toBeNull();
    });

    it('returns the selected country', () => {
      const state = createMockRootState({ selectedCountry: 'US' });

      expect(selectCardSelectedCountry(state)).toBe('US');
    });
  });

  describe('selectCardActiveProviderId', () => {
    it('returns null when no provider is active', () => {
      const state = createMockRootState();

      expect(selectCardActiveProviderId(state)).toBeNull();
    });

    it('returns the active provider ID', () => {
      const state = createMockRootState({ activeProviderId: 'baanx' });

      expect(selectCardActiveProviderId(state)).toBe('baanx');
    });
  });

  describe('selectIsCardAuthenticated', () => {
    it('returns false by default', () => {
      const state = createMockRootState();

      expect(selectIsCardAuthenticated(state)).toBe(false);
    });

    it('returns true when authenticated', () => {
      const state = createMockRootState({ isAuthenticated: true });

      expect(selectIsCardAuthenticated(state)).toBe(true);
    });
  });

  describe('selectCardholderAccounts', () => {
    it('returns empty array by default', () => {
      const state = createMockRootState();

      expect(selectCardholderAccounts(state)).toStrictEqual([]);
    });

    it('returns cardholder accounts', () => {
      const accounts = ['eip155:1:0xabc', 'eip155:1:0xdef'];
      const state = createMockRootState({ cardholderAccounts: accounts });

      expect(selectCardholderAccounts(state)).toStrictEqual(accounts);
    });
  });

  describe('when CardController state is undefined', () => {
    const state = {
      engine: { backgroundState: {} },
    } as unknown as RootState;

    it('returns null for selectedCountry', () => {
      expect(selectCardSelectedCountry(state)).toBeNull();
    });

    it('returns null for activeProviderId', () => {
      expect(selectCardActiveProviderId(state)).toBeNull();
    });

    it('returns false for isAuthenticated', () => {
      expect(selectIsCardAuthenticated(state)).toBe(false);
    });

    it('returns empty array for cardholderAccounts', () => {
      expect(selectCardholderAccounts(state)).toStrictEqual([]);
    });
  });
});

describe('selectHasCardholderAccounts', () => {
  it('returns false when cardholderAccounts is empty', () => {
    const state = createMockRootState({ cardholderAccounts: [] });
    expect(selectHasCardholderAccounts(state)).toBe(false);
  });

  it('returns true when there is at least one cardholder account', () => {
    const state = createMockRootState({
      cardholderAccounts: ['eip155:0:0xabc'],
    });
    expect(selectHasCardholderAccounts(state)).toBe(true);
  });
});

describe('selectIsCardholder', () => {
  const mockEvmAccount = {
    address: '0xabc',
    type: 'eip155:eoa',
    scopes: ['eip155:0'],
  } as unknown as InternalAccount;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEthAccount.mockReturnValue(true);
  });

  it('returns true when selected account address matches a cardholder CAIP-10 ID', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue(mockEvmAccount),
    );
    const state = createMockRootState({
      cardholderAccounts: ['eip155:0:0xabc'],
    });
    expect(selectIsCardholder(state)).toBe(true);
  });

  it('returns false when selected account address does not match any cardholder', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue(mockEvmAccount),
    );
    const state = createMockRootState({
      cardholderAccounts: ['eip155:0:0xdifferent'],
    });
    expect(selectIsCardholder(state)).toBe(false);
  });

  it('returns false when cardholderAccounts is empty', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue(mockEvmAccount),
    );
    const state = createMockRootState({ cardholderAccounts: [] });
    expect(selectIsCardholder(state)).toBe(false);
  });

  it('returns false when no selected account', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue(undefined),
    );
    const state = createMockRootState({
      cardholderAccounts: ['eip155:0:0xabc'],
    });
    expect(selectIsCardholder(state)).toBe(false);
  });

  it('returns false when selected account is not an EVM account', () => {
    mockIsEthAccount.mockReturnValue(false);
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue(mockEvmAccount),
    );
    const state = createMockRootState({
      cardholderAccounts: ['eip155:0:0xabc'],
    });
    expect(selectIsCardholder(state)).toBe(false);
  });

  it('is case-insensitive when comparing addresses', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue({ ...mockEvmAccount, address: '0xABC' }),
    );
    const state = createMockRootState({
      cardholderAccounts: ['eip155:0:0xabc'],
    });
    expect(selectIsCardholder(state)).toBe(true);
  });

  it('returns false for invalid CAIP-10 IDs in cardholderAccounts', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue(mockEvmAccount),
    );
    const state = createMockRootState({
      cardholderAccounts: ['not-a-caip-id'],
    });
    expect(selectIsCardholder(state)).toBe(false);
  });
});

describe('selectCardUserLocation', () => {
  it('returns null by default when providerData is empty', () => {
    const state = createMockRootState({ providerData: {} });
    expect(selectCardUserLocation(state)).toBeNull();
  });

  it('returns the location from providerData for the active provider', () => {
    const state = createMockRootState({
      activeProviderId: 'baanx',
      providerData: { baanx: { location: 'us' } },
    });
    expect(selectCardUserLocation(state)).toBe('us');
  });

  it('returns null when providerData has no location field', () => {
    const state = createMockRootState({
      activeProviderId: 'baanx',
      providerData: { baanx: {} },
    });
    expect(selectCardUserLocation(state)).toBeNull();
  });

  it('falls back to baanx provider when activeProviderId is null', () => {
    const state = createMockRootState({
      activeProviderId: null,
      providerData: { baanx: { location: 'us' } },
    });
    expect(selectCardUserLocation(state)).toBe('us');
  });

  it('returns null when CardController state is undefined', () => {
    const state = {
      engine: { backgroundState: {} },
    } as unknown as RootState;
    expect(selectCardUserLocation(state)).toBeNull();
  });
});

describe('selectCardHomeData', () => {
  it('returns null by default', () => {
    const state = createMockRootState();
    expect(selectCardHomeData(state)).toBeNull();
  });

  it('returns the cardHomeData object when populated', () => {
    const mockData = { primaryAsset: null, assets: [], card: null };
    const state = createMockRootState({
      cardHomeData: mockData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardHomeData(state)).toStrictEqual(mockData);
  });

  it('returns null when CardController state is undefined', () => {
    const state = {
      engine: { backgroundState: {} },
    } as unknown as RootState;
    expect(selectCardHomeData(state)).toBeNull();
  });
});

describe('selectCardHomeDataStatus', () => {
  it("returns 'idle' by default", () => {
    const state = createMockRootState();
    expect(selectCardHomeDataStatus(state)).toBe('idle');
  });

  it("returns 'loading' when status is loading", () => {
    const state = createMockRootState({ cardHomeDataStatus: 'loading' });
    expect(selectCardHomeDataStatus(state)).toBe('loading');
  });

  it("returns 'error' when status is error", () => {
    const state = createMockRootState({ cardHomeDataStatus: 'error' });
    expect(selectCardHomeDataStatus(state)).toBe('error');
  });

  it("returns 'success' when status is success", () => {
    const state = createMockRootState({ cardHomeDataStatus: 'success' });
    expect(selectCardHomeDataStatus(state)).toBe('success');
  });

  it("returns 'idle' when CardController state is undefined", () => {
    const state = {
      engine: { backgroundState: {} },
    } as unknown as RootState;
    expect(selectCardHomeDataStatus(state)).toBe('idle');
  });
});

const mockPrimaryAsset = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xusdc000000000000000000000000000000000001',
  walletAddress: '0xwallet000000000000000000000000000000000002',
  decimals: 6,
  chainId: 'eip155:59144',
  spendableBalance: '25.5',
  spendingCap: '500',
  priority: 1,
  status: FundingAssetStatus.Limited,
} as const;

const mockCardHomeData: CardHomeData = {
  primaryFundingAsset: mockPrimaryAsset,
  fundingAssets: [
    mockPrimaryAsset,
    {
      ...mockPrimaryAsset,
      symbol: 'USDT',
      address: '0xusdt000000000000000000000000000000000003',
      priority: 2,
    },
  ],
  availableFundingAssets: [mockPrimaryAsset],
  card: null,
  account: null,
  alerts: [],
  actions: [],
  delegationSettings: {
    networks: [
      {
        network: 'linea',
        environment: 'production',
        chainId: '59144',
        delegationContract: '0xdeleg000000000000000000000000000000000004',
        tokens: {},
      },
    ],
    count: 1,
    _links: { self: '/v1/delegation/chain/config' },
  },
};

describe('selectCardPrimaryToken', () => {
  it('returns null when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardPrimaryToken(state)).toBeNull();
  });

  it('maps primaryFundingAsset through toCardFundingToken', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    const token = selectCardPrimaryToken(state);
    expect(token).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        caipChainId: 'eip155:59144',
        fundingStatus: FundingStatus.Limited,
        spendableBalance: '25.5',
        spendingCap: '500',
        walletAddress: mockPrimaryAsset.walletAddress,
      }),
    );
  });
});

describe('selectCardAvailableTokens', () => {
  it('returns empty array when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardAvailableTokens(state)).toStrictEqual([]);
  });

  it('maps each availableFundingAsset through toCardFundingToken', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    const tokens = selectCardAvailableTokens(state);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        fundingStatus: FundingStatus.Limited,
      }),
    );
  });
});

describe('selectCardFundingTokens', () => {
  it('returns empty array when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardFundingTokens(state)).toStrictEqual([]);
  });

  it('maps each fundingAsset through toCardFundingToken', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    const tokens = selectCardFundingTokens(state);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.symbol).toBe('USDC');
    expect(tokens[1]?.symbol).toBe('USDT');
  });
});

describe('selectCardDelegationSettings', () => {
  it('returns null when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardDelegationSettings(state)).toBeNull();
  });

  it('returns delegationSettings from card home data', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardDelegationSettings(state)).toStrictEqual(
      mockCardHomeData.delegationSettings,
    );
  });
});
