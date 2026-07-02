import { RootState } from '../reducers';
import {
  selectCardSelectedCountry,
  selectCardActiveProviderId,
  selectIsCardAuthenticated,
  selectCardLastUnauthenticatedReason,
  selectIsMoneyAccountCardLinkInProgress,
  selectCardholderAccounts,
  selectHasCardholderAccounts,
  selectIsCardholder,
  selectCardUserLocation,
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectCardVerificationStatus,
  selectIsCardVerified,
  selectHasMetalCard,
  selectCardPrimaryToken,
  selectCardAvailableTokens,
  selectCardFundingTokens,
  selectCardDelegationSettings,
  selectIsMoneyAccountDelegatedForCard,
  selectCardCountryOfResidence,
  selectCardResidencyRegion,
  selectIsCardResidencyBlocked,
  selectCardRedemptionDestinationIsMoneyAccount,
} from './cardController';
import { selectPrimaryMoneyAccount } from './moneyAccountController';
import type { CardControllerState } from '../core/Engine/controllers/card-controller/types';
import {
  FundingAssetStatus,
  type CardFundingAsset,
  type CardHomeData,
} from '../core/Engine/controllers/card-controller/provider-types';
import { FundingStatus, CardType } from '../components/UI/Card/types';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { isEthAccount } from '../core/Multichain/utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';

jest.mock('./multichainAccounts/accounts');
jest.mock('../core/Multichain/utils');
jest.mock('./moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;
const mockIsEthAccount = isEthAccount as jest.MockedFunction<
  typeof isEthAccount
>;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.MockedFunction<
    () => { address: string } | undefined
  >;

const VEDA_ADDRESS = '0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae';
const VEDA_CAIP = 'eip155:143';
const VEDA_DELEGATION_CONTRACT = '0xC7f1b2228fbf28451c7bf791C4f610111f0f32cb';

const makeVedaDelegationSettings = () => ({
  networks: [
    {
      network: 'monad',
      environment: 'staging',
      chainId: '143',
      delegationContract: VEDA_DELEGATION_CONTRACT,
      tokens: {
        veda: { symbol: 'veda', decimals: 6, address: VEDA_ADDRESS },
      },
    },
  ],
  count: 1,
  _links: { self: '/v1/delegation/chain/config' },
});

const MONAD_VEDA_FEATURE_FLAG = {
  chains: {
    'eip155:143': {
      enabled: true,
      tokens: [
        {
          address: VEDA_ADDRESS,
          symbol: 'veda',
          decimals: 6,
          enabled: true,
          name: 'Veda',
        },
      ],
    },
  },
};

const createMockRootState = (
  overrides: Partial<CardControllerState> = {},
  cardFeatureFlag?: unknown,
  extraRemoteFlags?: Record<string, unknown>,
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
          moneyAccountCardLinkInProgress: false,
          ...overrides,
        },
        ...(cardFeatureFlag !== undefined || extraRemoteFlags !== undefined
          ? {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  ...(cardFeatureFlag !== undefined
                    ? { cardFeature: cardFeatureFlag }
                    : {}),
                  ...extraRemoteFlags,
                },
              },
            }
          : {}),
      },
    },
  }) as unknown as RootState;

describe('CardController selectors', () => {
  describe('selectIsMoneyAccountCardLinkInProgress', () => {
    it('returns false when CardController state is undefined', () => {
      const state = {
        engine: { backgroundState: {} },
      } as unknown as RootState;
      expect(selectIsMoneyAccountCardLinkInProgress(state)).toBe(false);
    });

    it('returns false when linkage is not in progress', () => {
      const state = createMockRootState({
        moneyAccountCardLinkInProgress: false,
      });
      expect(selectIsMoneyAccountCardLinkInProgress(state)).toBe(false);
    });

    it('returns true when linkage is in progress', () => {
      const state = createMockRootState({
        moneyAccountCardLinkInProgress: true,
      });
      expect(selectIsMoneyAccountCardLinkInProgress(state)).toBe(true);
    });
  });

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

  describe('selectCardLastUnauthenticatedReason', () => {
    it('returns null by default', () => {
      const state = createMockRootState();

      expect(selectCardLastUnauthenticatedReason(state)).toBeNull();
    });

    it('returns the last unauthenticated reason when set', () => {
      const state = createMockRootState({
        lastUnauthenticatedReason: 'onboarding_token_revoked',
      });

      expect(selectCardLastUnauthenticatedReason(state)).toBe(
        'onboarding_token_revoked',
      );
    });

    it('returns null when CardController state is undefined', () => {
      const state = {
        engine: { backgroundState: {} },
      } as unknown as RootState;

      expect(selectCardLastUnauthenticatedReason(state)).toBeNull();
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

describe('selectCardVerificationStatus', () => {
  it('returns null when cardHomeData is missing', () => {
    const state = createMockRootState();
    expect(selectCardVerificationStatus(state)).toBeNull();
  });

  it('returns null when account is missing', () => {
    const state = createMockRootState({
      cardHomeData: {
        account: null,
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardVerificationStatus(state)).toBeNull();
  });

  it('returns the account verification status when present', () => {
    const state = createMockRootState({
      cardHomeData: {
        account: { verificationStatus: 'PENDING' },
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardVerificationStatus(state)).toBe('PENDING');
  });
});

describe('selectIsCardVerified', () => {
  it('returns true only when verification status is VERIFIED', () => {
    const state = createMockRootState({
      cardHomeData: {
        account: { verificationStatus: 'VERIFIED' },
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectIsCardVerified(state)).toBe(true);
  });

  it.each(['PENDING', 'UNVERIFIED', 'REJECTED', null] as const)(
    'returns false when verification status is %s',
    (verificationStatus) => {
      const state = createMockRootState({
        cardHomeData: {
          account: verificationStatus ? { verificationStatus } : null,
        } as unknown as CardControllerState['cardHomeData'],
      });
      expect(selectIsCardVerified(state)).toBe(false);
    },
  );

  it('returns false when cardHomeData is missing even if user is a cardholder', () => {
    const state = createMockRootState({
      cardholderAccounts: ['eip155:1:0xabc'],
      cardHomeData: null,
    });
    expect(selectIsCardVerified(state)).toBe(false);
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

describe('selectHasMetalCard', () => {
  it('returns false when card home data is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectHasMetalCard(state)).toBe(false);
  });

  it('returns false when card is null', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        card: null,
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectHasMetalCard(state)).toBe(false);
  });

  it('returns false for a virtual card', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        card: {
          id: 'card-1',
          status: 'ACTIVE' as never,
          type: CardType.VIRTUAL,
          lastFour: '1234',
        },
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectHasMetalCard(state)).toBe(false);
  });

  it('returns true for a metal card', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        card: {
          id: 'card-1',
          status: 'ACTIVE' as never,
          type: CardType.METAL,
          lastFour: '1234',
        },
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectHasMetalCard(state)).toBe(true);
  });
});

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

  it('sets isMoneyAccountEntry to false for non-Veda primary tokens', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardPrimaryToken(state)?.isMoneyAccountEntry).toBe(false);
    expect(selectCardPrimaryToken(state)?.displaySymbol).toBeUndefined();
  });

  it('sets isMoneyAccountEntry and displaySymbol=mUSD when the primary funding asset is the Veda token allowlisted in cardFeature', () => {
    const homeData: CardHomeData = {
      ...mockCardHomeData,
      primaryFundingAsset: {
        ...mockPrimaryAsset,
        symbol: 'veda',
        address: VEDA_ADDRESS,
        chainId: VEDA_CAIP,
      },
      delegationSettings: makeVedaDelegationSettings(),
    } as unknown as CardHomeData;
    const state = createMockRootState(
      {
        cardHomeData:
          homeData as unknown as CardControllerState['cardHomeData'],
      },
      MONAD_VEDA_FEATURE_FLAG,
    );
    const token = selectCardPrimaryToken(state);
    expect(token?.isMoneyAccountEntry).toBe(true);
    expect(token?.displaySymbol).toBe('mUSD');
  });

  it('does not flag the Veda primary funding asset when veda is not allowlisted in cardFeature', () => {
    const homeData: CardHomeData = {
      ...mockCardHomeData,
      primaryFundingAsset: {
        ...mockPrimaryAsset,
        symbol: 'veda',
        address: VEDA_ADDRESS,
        chainId: VEDA_CAIP,
      },
      delegationSettings: makeVedaDelegationSettings(),
    } as unknown as CardHomeData;
    const state = createMockRootState({
      cardHomeData: homeData as unknown as CardControllerState['cardHomeData'],
    });
    const token = selectCardPrimaryToken(state);
    expect(token?.isMoneyAccountEntry).toBe(false);
    expect(token?.displaySymbol).toBeUndefined();
  });
});

describe('selectCardAvailableTokens', () => {
  const WALLET_A = '0xwalletA000000000000000000000000000000001';
  const WALLET_B = '0xwalletB000000000000000000000000000000002';

  const makeAsset = (
    overrides: Partial<(typeof mockCardHomeData.availableFundingAssets)[0]>,
  ) => ({ ...mockPrimaryAsset, ...overrides });

  const stateWithAssets = (
    assets: typeof mockCardHomeData.fundingAssets,
    currentWallet?: string,
  ) => {
    if (currentWallet) {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: currentWallet }),
      );
    } else {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue(undefined),
      );
    }
    return createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        fundingAssets: assets,
      } as unknown as CardControllerState['cardHomeData'],
    });
  };

  beforeEach(() => {
    // Default: no selected account — filter is a no-op.
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue(undefined),
    );
  });

  it('returns empty array when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardAvailableTokens(state)).toStrictEqual([]);
  });

  it('maps each fundingAsset through toCardFundingToken', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    const tokens = selectCardAvailableTokens(state);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        fundingStatus: FundingStatus.Limited,
      }),
    );
    expect(tokens[1]).toEqual(
      expect.objectContaining({
        symbol: 'USDT',
        fundingStatus: FundingStatus.Limited,
      }),
    );
  });

  it('shows all assets when no account is selected', () => {
    const assets = [
      makeAsset({ walletAddress: WALLET_A, status: FundingAssetStatus.Active }),
      makeAsset({
        walletAddress: WALLET_B,
        status: FundingAssetStatus.Inactive,
      }),
    ];
    const state = stateWithAssets(assets);
    expect(selectCardAvailableTokens(state)).toHaveLength(2);
  });

  it('always shows Active and Limited tokens regardless of wallet', () => {
    const assets = [
      makeAsset({ walletAddress: WALLET_B, status: FundingAssetStatus.Active }),
      makeAsset({
        walletAddress: WALLET_B,
        status: FundingAssetStatus.Limited,
      }),
    ];
    const state = stateWithAssets(assets, WALLET_A);
    expect(selectCardAvailableTokens(state)).toHaveLength(2);
  });

  it('shows Inactive token only for the current wallet', () => {
    const assets = [
      makeAsset({
        walletAddress: WALLET_A,
        status: FundingAssetStatus.Inactive,
      }),
      makeAsset({
        walletAddress: WALLET_B,
        status: FundingAssetStatus.Inactive,
      }),
    ];
    const state = stateWithAssets(assets, WALLET_A);
    const tokens = selectCardAvailableTokens(state);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].walletAddress).toBe(WALLET_A);
  });

  it('shows Inactive token with empty walletAddress for any current wallet', () => {
    const assets = [
      makeAsset({ walletAddress: '', status: FundingAssetStatus.Inactive }),
    ];
    const state = stateWithAssets(assets, WALLET_A);
    expect(selectCardAvailableTokens(state)).toHaveLength(1);
  });

  it('shows Active from walletB and Inactive placeholder for walletA simultaneously', () => {
    const assets = [
      makeAsset({ walletAddress: WALLET_B, status: FundingAssetStatus.Active }),
      makeAsset({
        walletAddress: WALLET_A,
        status: FundingAssetStatus.Inactive,
      }),
    ];
    const state = stateWithAssets(assets, WALLET_A);
    const tokens = selectCardAvailableTokens(state);
    expect(tokens).toHaveLength(2);
  });

  describe('placeholder synthesis from delegationSettings', () => {
    const cardHomeDataWithDelegationToken: CardHomeData = {
      ...mockCardHomeData,
      fundingAssets: [],
      delegationSettings: {
        networks: [
          {
            network: 'linea',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdeleg000000000000000000000000000000000004',
            tokens: {
              USDC: {
                address: '0xusdc000000000000000000000000000000000010',
                symbol: 'USDC',
                decimals: 6,
              },
            },
          },
        ],
        count: 1,
        _links: { self: '/v1/delegation/chain/config' },
      },
    } as unknown as CardHomeData;

    it('synthesizes a placeholder stamped with the current wallet for tokens with no real entry', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithDelegationToken as unknown as CardControllerState['cardHomeData'],
      });
      const tokens = selectCardAvailableTokens(state);
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual(
        expect.objectContaining({
          symbol: 'USDC',
          caipChainId: 'eip155:59144',
          fundingStatus: FundingStatus.NotEnabled,
          walletAddress: WALLET_A,
        }),
      );
    });

    it('does not synthesize placeholders when no EVM account is selected', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue(undefined),
      );
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithDelegationToken as unknown as CardControllerState['cardHomeData'],
      });
      const tokens = selectCardAvailableTokens(state);
      expect(tokens).toStrictEqual([]);
    });

    it('reflects the new account on account switch without any data change', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const stateA = createMockRootState({
        cardHomeData:
          cardHomeDataWithDelegationToken as unknown as CardControllerState['cardHomeData'],
      });
      const tokensA = selectCardAvailableTokens(stateA);
      expect(tokensA[0]?.walletAddress).toBe(WALLET_A);

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_B }),
      );
      const stateB = createMockRootState({
        cardHomeData:
          cardHomeDataWithDelegationToken as unknown as CardControllerState['cardHomeData'],
      });
      const tokensB = selectCardAvailableTokens(stateB);
      expect(tokensB).toHaveLength(1);
      expect(tokensB[0]?.walletAddress).toBe(WALLET_B);
    });

    it('drops a placeholder whose token is not in the cardFeature allowlist', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const homeData = {
        ...mockCardHomeData,
        fundingAssets: [],
        delegationSettings: {
          networks: [
            {
              network: 'linea',
              environment: 'production',
              chainId: '59144',
              delegationContract: '0xdeleg000000000000000000000000000000000004',
              tokens: {
                FOO: {
                  address: '0xfoo0000000000000000000000000000000000099',
                  symbol: 'FOO',
                  decimals: 18,
                },
              },
            },
          ],
          count: 1,
          _links: { self: '/v1/delegation/chain/config' },
        },
      } as unknown as CardHomeData;
      const state = createMockRootState({
        cardHomeData:
          homeData as unknown as CardControllerState['cardHomeData'],
      });
      expect(selectCardAvailableTokens(state)).toStrictEqual([]);
    });

    it('drops the veda placeholder when veda is not allowlisted on monad', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const homeData = {
        ...mockCardHomeData,
        fundingAssets: [],
        delegationSettings: makeVedaDelegationSettings(),
      } as unknown as CardHomeData;
      const state = createMockRootState({
        cardHomeData:
          homeData as unknown as CardControllerState['cardHomeData'],
      });
      expect(selectCardAvailableTokens(state)).toStrictEqual([]);
    });

    it('keeps the veda placeholder as mUSD when monad+veda is allowlisted in cardFeature', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const homeData = {
        ...mockCardHomeData,
        fundingAssets: [],
        delegationSettings: makeVedaDelegationSettings(),
      } as unknown as CardHomeData;
      const state = createMockRootState(
        {
          cardHomeData:
            homeData as unknown as CardControllerState['cardHomeData'],
        },
        MONAD_VEDA_FEATURE_FLAG,
      );
      const tokens = selectCardAvailableTokens(state);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].displaySymbol).toBe('mUSD');
      expect(tokens[0].isMoneyAccountEntry).toBe(true);
    });

    it('suppresses the placeholder when the current wallet already has a real entry for the same token+chain', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const cardHomeDataWithRealUsdcForA = {
        ...cardHomeDataWithDelegationToken,
        fundingAssets: [
          {
            ...mockPrimaryAsset,
            walletAddress: WALLET_A,
            address: '0xusdc000000000000000000000000000000000010',
            symbol: 'USDC',
            chainId: 'eip155:59144',
            status: FundingAssetStatus.Active,
          },
        ],
      } as unknown as CardHomeData;
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithRealUsdcForA as unknown as CardControllerState['cardHomeData'],
      });
      const tokens = selectCardAvailableTokens(state);
      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.fundingStatus).toBe(FundingStatus.Enabled);
      expect(tokens[0]?.walletAddress).toBe(WALLET_A);
    });

    it('orders by priority asc then by status (Enabled → Limited → NotEnabled), with placeholders last', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      // Intentionally raw/unsorted API order: NotEnabled first, then high
      // priority, then a no-priority Limited entry. Without an explicit sort
      // the selector would emit them in this order and append the synthesized
      // USDC placeholder at the end, losing the deterministic UI ordering.
      const cardHomeDataMixed = {
        ...cardHomeDataWithDelegationToken,
        fundingAssets: [
          {
            ...mockPrimaryAsset,
            symbol: 'WETH',
            address: '0xweth000000000000000000000000000000000020',
            walletAddress: WALLET_A,
            chainId: 'eip155:8453',
            priority: Number.MAX_SAFE_INTEGER,
            status: FundingAssetStatus.Inactive,
          },
          {
            ...mockPrimaryAsset,
            symbol: 'USDT',
            address: '0xusdt000000000000000000000000000000000021',
            walletAddress: WALLET_A,
            chainId: 'eip155:59144',
            priority: 1,
            status: FundingAssetStatus.Active,
          },
          {
            ...mockPrimaryAsset,
            symbol: 'DAI',
            address: '0xdai0000000000000000000000000000000000022',
            walletAddress: WALLET_A,
            chainId: 'eip155:59144',
            priority: Number.MAX_SAFE_INTEGER,
            status: FundingAssetStatus.Limited,
          },
        ],
      } as unknown as CardHomeData;
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataMixed as unknown as CardControllerState['cardHomeData'],
      });
      const tokens = selectCardAvailableTokens(state);
      expect(tokens.map((t) => t.symbol)).toStrictEqual([
        'USDT',
        'DAI',
        'WETH',
        'USDC',
      ]);
    });

    it('still synthesizes the placeholder for the current wallet when another wallet has the real entry', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const cardHomeDataWithRealUsdcForB = {
        ...cardHomeDataWithDelegationToken,
        fundingAssets: [
          {
            ...mockPrimaryAsset,
            walletAddress: WALLET_B,
            address: '0xusdc000000000000000000000000000000000010',
            symbol: 'USDC',
            chainId: 'eip155:59144',
            status: FundingAssetStatus.Active,
          },
        ],
      } as unknown as CardHomeData;
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithRealUsdcForB as unknown as CardControllerState['cardHomeData'],
      });
      const tokens = selectCardAvailableTokens(state);
      expect(tokens).toHaveLength(2);
      const placeholder = tokens.find(
        (t) => t.fundingStatus === FundingStatus.NotEnabled,
      );
      expect(placeholder?.walletAddress).toBe(WALLET_A);
    });
  });

  describe('isMoneyAccountEntry flag', () => {
    it('flags real entries that match the Veda token allowlisted in cardFeature', () => {
      const assets = [
        makeAsset({
          walletAddress: WALLET_A,
          address: VEDA_ADDRESS,
          chainId: VEDA_CAIP,
          status: FundingAssetStatus.Active,
        }),
        makeAsset({
          walletAddress: WALLET_B,
          address: '0xnonveda0000000000000000000000000000000099',
          chainId: VEDA_CAIP,
          status: FundingAssetStatus.Active,
        }),
      ];
      const state = createMockRootState(
        {
          cardHomeData: {
            ...mockCardHomeData,
            fundingAssets: assets,
            delegationSettings: makeVedaDelegationSettings(),
          } as unknown as CardControllerState['cardHomeData'],
        },
        MONAD_VEDA_FEATURE_FLAG,
      );
      const tokens = selectCardAvailableTokens(state);
      const vedaToken = tokens.find((t) => t.address === VEDA_ADDRESS);
      const otherToken = tokens.find((t) => t.address !== VEDA_ADDRESS);
      expect(vedaToken?.isMoneyAccountEntry).toBe(true);
      expect(vedaToken?.displaySymbol).toBe('mUSD');
      expect(otherToken?.isMoneyAccountEntry).toBe(false);
      expect(otherToken?.displaySymbol).toBeUndefined();
    });

    it('still flags real Veda entries when delegationSettings omits Veda but cardFeature allowlists it', () => {
      const assets = [
        makeAsset({
          walletAddress: WALLET_A,
          address: VEDA_ADDRESS,
          chainId: VEDA_CAIP,
          status: FundingAssetStatus.Active,
        }),
      ];
      const state = createMockRootState(
        {
          cardHomeData: {
            ...mockCardHomeData,
            fundingAssets: assets,
            delegationSettings: {
              networks: [],
              count: 0,
              _links: { self: '' },
            },
          } as unknown as CardControllerState['cardHomeData'],
        },
        MONAD_VEDA_FEATURE_FLAG,
      );
      const vedaToken = selectCardAvailableTokens(state).find(
        (t) => t.address === VEDA_ADDRESS,
      );
      expect(vedaToken?.isMoneyAccountEntry).toBe(true);
      expect(vedaToken?.displaySymbol).toBe('mUSD');
    });

    it('does not flag real Veda entries when cardFeature does not allowlist Veda', () => {
      const assets = [
        makeAsset({
          walletAddress: WALLET_A,
          address: VEDA_ADDRESS,
          chainId: VEDA_CAIP,
          status: FundingAssetStatus.Active,
        }),
      ];
      const state = createMockRootState({
        cardHomeData: {
          ...mockCardHomeData,
          fundingAssets: assets,
          delegationSettings: makeVedaDelegationSettings(),
        } as unknown as CardControllerState['cardHomeData'],
      });
      const vedaToken = selectCardAvailableTokens(state).find(
        (t) => t.address === VEDA_ADDRESS,
      );
      expect(vedaToken?.isMoneyAccountEntry).toBe(false);
      expect(vedaToken?.displaySymbol).toBeUndefined();
    });

    it('flags the synthesized Veda placeholder for the current wallet', () => {
      const cardHomeDataWithVeda = {
        ...mockCardHomeData,
        fundingAssets: [],
        delegationSettings: makeVedaDelegationSettings(),
      } as unknown as CardHomeData;
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A } as InternalAccount),
      );
      const state = createMockRootState(
        {
          cardHomeData:
            cardHomeDataWithVeda as unknown as CardControllerState['cardHomeData'],
        },
        MONAD_VEDA_FEATURE_FLAG,
      );
      const tokens = selectCardAvailableTokens(state);
      const placeholder = tokens.find(
        (t) => t.fundingStatus === FundingStatus.NotEnabled,
      );
      expect(placeholder?.walletAddress).toBe(WALLET_A);
      expect(placeholder?.address?.toLowerCase()).toBe(VEDA_ADDRESS);
      expect(placeholder?.isMoneyAccountEntry).toBe(true);
      expect(placeholder?.displaySymbol).toBe('mUSD');
    });

    it('does not flag non-Veda placeholders even when synthesized for the current wallet', () => {
      const cardHomeDataWithUsdc = {
        ...mockCardHomeData,
        fundingAssets: [],
        delegationSettings: {
          networks: [
            {
              network: 'linea',
              environment: 'production',
              chainId: '59144',
              delegationContract: '0xdeleg000000000000000000000000000000000004',
              tokens: {
                USDC: {
                  symbol: 'USDC',
                  decimals: 6,
                  address: '0xusdc000000000000000000000000000000000010',
                },
              },
            },
          ],
          count: 1,
          _links: { self: '' },
        },
      } as unknown as CardHomeData;
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A } as InternalAccount),
      );
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithUsdc as unknown as CardControllerState['cardHomeData'],
      });
      const tokens = selectCardAvailableTokens(state);
      const placeholder = tokens.find(
        (t) => t.fundingStatus === FundingStatus.NotEnabled,
      );
      expect(placeholder?.isMoneyAccountEntry).toBe(false);
    });
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

  it('flags only the funding row matching the Veda token allowlisted in cardFeature', () => {
    const cardHomeData: CardHomeData = {
      ...mockCardHomeData,
      fundingAssets: [
        {
          ...mockPrimaryAsset,
          symbol: 'veda',
          address: VEDA_ADDRESS,
          chainId: VEDA_CAIP,
        },
        {
          ...mockPrimaryAsset,
          symbol: 'USDT',
          address: '0xusdt000000000000000000000000000000000003',
        },
      ],
      delegationSettings: makeVedaDelegationSettings(),
    } as unknown as CardHomeData;
    const state = createMockRootState(
      {
        cardHomeData:
          cardHomeData as unknown as CardControllerState['cardHomeData'],
      },
      MONAD_VEDA_FEATURE_FLAG,
    );
    const tokens = selectCardFundingTokens(state);
    expect(tokens).toHaveLength(2);
    const vedaRow = tokens.find((t) => t.address === VEDA_ADDRESS);
    const usdtRow = tokens.find((t) => t.symbol === 'USDT');
    expect(vedaRow?.isMoneyAccountEntry).toBe(true);
    expect(vedaRow?.displaySymbol).toBe('mUSD');
    expect(usdtRow?.isMoneyAccountEntry).toBe(false);
    expect(usdtRow?.displaySymbol).toBeUndefined();
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

describe('selectIsMoneyAccountDelegatedForCard', () => {
  const MA_ADDRESS = '0xma000000000000000000000000000000000000aa';

  const vedaFundingAsset: CardFundingAsset = {
    symbol: 'veda',
    name: 'veda',
    address: VEDA_ADDRESS,
    walletAddress: MA_ADDRESS,
    decimals: 6,
    chainId: VEDA_CAIP,
    spendableBalance: '0',
    spendingCap: '0',
    priority: 1,
    status: FundingAssetStatus.Active,
  };

  const homeDataWithVeda = (
    overrides: Partial<CardFundingAsset> = {},
  ): CardHomeData => ({
    ...mockCardHomeData,
    fundingAssets: [{ ...vedaFundingAsset, ...overrides }],
    delegationSettings: makeVedaDelegationSettings(),
  });

  const stateWithVeda = (home: CardHomeData) =>
    createMockRootState(
      { cardHomeData: home as unknown as CardControllerState['cardHomeData'] },
      MONAD_VEDA_FEATURE_FLAG,
    );

  beforeEach(() => {
    mockSelectPrimaryMoneyAccount.mockReset();
  });

  it('returns false when there is no primary Money Account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);
    const state = stateWithVeda(homeDataWithVeda());

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns false when there are no funding assets', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({ cardHomeData: null });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns false when cardFeature does not allowlist Veda', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        fundingAssets: [vedaFundingAsset],
        delegationSettings: makeVedaDelegationSettings(),
      } as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns true when the primary Money Account has an active Veda funding row', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = stateWithVeda(homeDataWithVeda());

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(true);
  });

  it('returns true even when delegationSettings omit Veda but cardFeature allowlists it', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = stateWithVeda({
      ...mockCardHomeData,
      fundingAssets: [vedaFundingAsset],
      delegationSettings: { networks: [], count: 0, _links: { self: '' } },
    } as unknown as CardHomeData);

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(true);
  });

  it('returns true when the matching row has Limited (partial allowance) status', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = stateWithVeda(
      homeDataWithVeda({ status: FundingAssetStatus.Limited }),
    );

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(true);
  });

  it('returns false when the matching row is Inactive (NotEnabled)', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = stateWithVeda(
      homeDataWithVeda({ status: FundingAssetStatus.Inactive }),
    );

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns false when the wallet address on the funding row does not match the Money Account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = stateWithVeda(
      homeDataWithVeda({
        walletAddress: '0xother000000000000000000000000000000000099',
      }),
    );

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns false when the Money Account row is on a different chain than Monad', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = stateWithVeda(homeDataWithVeda({ chainId: 'eip155:59144' }));

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('matches addresses case-insensitively', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MA_ADDRESS.toUpperCase(),
    });
    const state = stateWithVeda(homeDataWithVeda());

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(true);
  });
});

describe('selectCardCountryOfResidence', () => {
  it('returns null when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardCountryOfResidence(state)).toBeNull();
  });

  it('returns null when account is null', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardCountryOfResidence(state)).toBeNull();
  });

  it('returns countryOfResidence from account', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        account: {
          verificationStatus: 'VERIFIED',
          provisioningEligible: false,
          holderName: 'Test User',
          shippingAddress: null,
          countryOfResidence: 'GB',
          usState: null,
        },
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardCountryOfResidence(state)).toBe('GB');
  });
});

describe('selectCardResidencyRegion', () => {
  it('returns US-{STATE} for US cardholders with a known state', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        account: {
          verificationStatus: 'VERIFIED',
          provisioningEligible: false,
          holderName: 'Test User',
          shippingAddress: null,
          countryOfResidence: 'US',
          usState: 'CA',
        },
      } as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardResidencyRegion(state)).toBe('US-CA');
  });
});

describe('selectIsCardResidencyBlocked', () => {
  const moneyBlockedFlags = (blockedRegions: string[]) => ({
    moneyAccountGeoBlockedCountries: { blockedRegions },
  });

  it('returns false when countryOfResidence is null (fail-open)', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectIsCardResidencyBlocked(state)).toBe(false);
  });

  it('returns true when countryOfResidence is GB and GB is blocked', () => {
    const state = createMockRootState(
      {
        cardHomeData: {
          ...mockCardHomeData,
          account: {
            verificationStatus: 'VERIFIED',
            provisioningEligible: false,
            holderName: 'Test User',
            shippingAddress: null,
            countryOfResidence: 'GB',
            usState: null,
          },
        } as unknown as CardControllerState['cardHomeData'],
      },
      undefined,
      moneyBlockedFlags(['GB']),
    );
    expect(selectIsCardResidencyBlocked(state)).toBe(true);
  });

  it('returns false when countryOfResidence is not in blocked set', () => {
    const state = createMockRootState(
      {
        cardHomeData: {
          ...mockCardHomeData,
          account: {
            verificationStatus: 'VERIFIED',
            provisioningEligible: false,
            holderName: 'Test User',
            shippingAddress: null,
            countryOfResidence: 'US',
            usState: 'NY',
          },
        } as unknown as CardControllerState['cardHomeData'],
      },
      undefined,
      moneyBlockedFlags(['GB']),
    );
    expect(selectIsCardResidencyBlocked(state)).toBe(false);
  });

  it('returns true when US-CA is blocked and cardholder is in California', () => {
    const state = createMockRootState(
      {
        cardHomeData: {
          ...mockCardHomeData,
          account: {
            verificationStatus: 'VERIFIED',
            provisioningEligible: false,
            holderName: 'Test User',
            shippingAddress: null,
            countryOfResidence: 'US',
            usState: 'CA',
          },
        } as unknown as CardControllerState['cardHomeData'],
      },
      undefined,
      moneyBlockedFlags(['US-CA']),
    );
    expect(selectIsCardResidencyBlocked(state)).toBe(true);
  });

  it('returns false when only US-CA is blocked and cardholder is in New York', () => {
    const state = createMockRootState(
      {
        cardHomeData: {
          ...mockCardHomeData,
          account: {
            verificationStatus: 'VERIFIED',
            provisioningEligible: false,
            holderName: 'Test User',
            shippingAddress: null,
            countryOfResidence: 'US',
            usState: 'NY',
          },
        } as unknown as CardControllerState['cardHomeData'],
      },
      undefined,
      moneyBlockedFlags(['US-CA']),
    );
    expect(selectIsCardResidencyBlocked(state)).toBe(false);
  });

  it('returns true when entire US is blocked', () => {
    const state = createMockRootState(
      {
        cardHomeData: {
          ...mockCardHomeData,
          account: {
            verificationStatus: 'VERIFIED',
            provisioningEligible: false,
            holderName: 'Test User',
            shippingAddress: null,
            countryOfResidence: 'US',
            usState: 'NY',
          },
        } as unknown as CardControllerState['cardHomeData'],
      },
      undefined,
      moneyBlockedFlags(['US']),
    );
    expect(selectIsCardResidencyBlocked(state)).toBe(true);
  });
});

describe('selectCardAvailableTokens residency blocking', () => {
  const WALLET_A = '0xwalletA000000000000000000000000000000001';
  const moneyBlockedFlags = (blockedRegions: string[]) => ({
    moneyAccountGeoBlockedCountries: { blockedRegions },
  });

  it('suppresses Money Account placeholder entries when residency is blocked', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue({ address: WALLET_A }),
    );
    const homeData = {
      ...mockCardHomeData,
      fundingAssets: [],
      delegationSettings: makeVedaDelegationSettings(),
      account: {
        verificationStatus: 'VERIFIED',
        provisioningEligible: false,
        holderName: 'Test User',
        shippingAddress: null,
        countryOfResidence: 'GB',
        usState: null,
      },
    } as unknown as CardHomeData;
    const state = createMockRootState(
      {
        cardHomeData:
          homeData as unknown as CardControllerState['cardHomeData'],
      },
      MONAD_VEDA_FEATURE_FLAG,
      moneyBlockedFlags(['GB']),
    );
    expect(selectCardAvailableTokens(state)).toStrictEqual([]);
  });

  it('keeps active Money Account funding rows when residency is blocked', () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue(
      jest.fn().mockReturnValue({ address: WALLET_A }),
    );
    const homeData = {
      ...mockCardHomeData,
      fundingAssets: [
        {
          symbol: 'veda',
          name: 'Veda',
          address: VEDA_ADDRESS,
          walletAddress: WALLET_A,
          decimals: 6,
          chainId: VEDA_CAIP,
          spendableBalance: '10',
          spendingCap: '100',
          priority: 1,
          status: FundingAssetStatus.Active,
          delegationContract: VEDA_DELEGATION_CONTRACT,
        },
      ],
      delegationSettings: makeVedaDelegationSettings(),
      account: {
        verificationStatus: 'VERIFIED',
        provisioningEligible: false,
        holderName: 'Test User',
        shippingAddress: null,
        countryOfResidence: 'GB',
        usState: null,
      },
    } as unknown as CardHomeData;
    const state = createMockRootState(
      {
        cardHomeData:
          homeData as unknown as CardControllerState['cardHomeData'],
      },
      MONAD_VEDA_FEATURE_FLAG,
      moneyBlockedFlags(['GB']),
    );
    const tokens = selectCardAvailableTokens(state);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].isMoneyAccountEntry).toBe(true);
    expect(tokens[0].fundingStatus).toBe(FundingStatus.Enabled);
  });
});

describe('selectCardRedemptionDestinationIsMoneyAccount', () => {
  const homeDataWithPriority = (
    externalWalletPriority: unknown[],
  ): CardControllerState['cardHomeData'] =>
    ({
      ...mockCardHomeData,
      delegationSettings: makeVedaDelegationSettings(),
      externalWalletPriority,
    }) as unknown as CardControllerState['cardHomeData'];

  beforeEach(() => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
  });

  it('is false when the top-priority destination is a non-VEDA wallet (steur/linea)', () => {
    const state = createMockRootState({
      cardHomeData: homeDataWithPriority([
        {
          id: 1,
          address: '0xlinea',
          currency: 'steur',
          network: 'linea',
          priority: 1,
        },
        {
          id: 2,
          address: '0xmonad',
          currency: 'veda',
          network: 'monad',
          priority: 2,
        },
      ]),
    });
    expect(selectCardRedemptionDestinationIsMoneyAccount(state)).toBe(false);
  });

  it('is true when the top-priority destination is the veda/monad Money Account', () => {
    const state = createMockRootState({
      cardHomeData: homeDataWithPriority([
        {
          id: 1,
          address: '0xmonad',
          currency: 'veda',
          network: 'monad',
          priority: 1,
        },
        {
          id: 2,
          address: '0xlinea',
          currency: 'steur',
          network: 'linea',
          priority: 2,
        },
      ]),
    });
    expect(selectCardRedemptionDestinationIsMoneyAccount(state)).toBe(true);
  });

  it('falls back to the region + has-MA heuristic when there is no priority data', () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue({
      address: '0xprimaryma',
    });
    const state = createMockRootState({
      cardHomeData: homeDataWithPriority([]),
    });
    expect(selectCardRedemptionDestinationIsMoneyAccount(state)).toBe(true);
  });
});
