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
  selectCardHasApprovedLineaFunding,
  selectCardLineaUsdcToken,
  selectIsMoneyAccountDelegatedForCard,
} from './cardController';
import {
  selectMoneyAccounts,
  selectPrimaryMoneyAccount,
} from './moneyAccountController';
import type { CardControllerState } from '../core/Engine/controllers/card-controller/types';
import {
  FundingAssetStatus,
  type CardFundingAsset,
  type CardHomeData,
} from '../core/Engine/controllers/card-controller/provider-types';
import { FundingStatus } from '../components/UI/Card/types';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { isEthAccount } from '../core/Multichain/utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';

jest.mock('./multichainAccounts/accounts');
jest.mock('../core/Multichain/utils');
jest.mock('./moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
  selectMoneyAccounts: jest.fn(() => ({})),
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
const mockSelectMoneyAccounts =
  selectMoneyAccounts as unknown as jest.MockedFunction<
    () => Record<string, { address: string }>
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
  beforeEach(() => {
    mockSelectMoneyAccounts.mockReturnValue({});
  });

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

  it('sets isMoneyAccountEntry to false when no money accounts exist', () => {
    mockSelectMoneyAccounts.mockReturnValue({});
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardPrimaryToken(state)?.isMoneyAccountEntry).toBe(false);
  });

  it('sets isMoneyAccountEntry to false when no money account matches the walletAddress', () => {
    mockSelectMoneyAccounts.mockReturnValue({
      'ma-1': { address: '0xnotthewallet000000000000000000000000000001' },
    });
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardPrimaryToken(state)?.isMoneyAccountEntry).toBe(false);
  });

  it('sets isMoneyAccountEntry to true when the primary funding asset walletAddress matches a money account', () => {
    mockSelectMoneyAccounts.mockReturnValue({
      'ma-1': { address: mockPrimaryAsset.walletAddress },
    });
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    expect(selectCardPrimaryToken(state)?.isMoneyAccountEntry).toBe(true);
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
    beforeEach(() => {
      mockSelectMoneyAccounts.mockReturnValue({});
    });

    it('flags real entries whose walletAddress matches a money account', () => {
      mockSelectMoneyAccounts.mockReturnValue({
        'ma-1': { address: WALLET_A },
      });
      const assets = [
        makeAsset({
          walletAddress: WALLET_A,
          status: FundingAssetStatus.Active,
        }),
        makeAsset({
          walletAddress: WALLET_B,
          status: FundingAssetStatus.Active,
        }),
      ];
      const state = stateWithAssets(assets);
      const tokens = selectCardAvailableTokens(state);
      const aTokens = tokens.filter(
        (t) => t.walletAddress?.toLowerCase() === WALLET_A.toLowerCase(),
      );
      const bTokens = tokens.filter(
        (t) => t.walletAddress?.toLowerCase() === WALLET_B.toLowerCase(),
      );
      expect(aTokens.every((t) => t.isMoneyAccountEntry === true)).toBe(true);
      expect(bTokens.every((t) => t.isMoneyAccountEntry === false)).toBe(true);
    });

    it('flags synthesized placeholders when the current EVM wallet is a money account', () => {
      mockSelectMoneyAccounts.mockReturnValue({
        'ma-1': { address: WALLET_A },
      });
      const cardHomeDataWithDelegationToken = {
        ...mockCardHomeData,
        fundingAssets: [],
        delegationSettings: {
          ...mockCardHomeData.delegationSettings,
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
        },
      } as unknown as CardHomeData;
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A } as InternalAccount),
      );
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithDelegationToken as unknown as CardControllerState['cardHomeData'],
      });
      const tokens = selectCardAvailableTokens(state);
      const placeholder = tokens.find(
        (t) => t.fundingStatus === FundingStatus.NotEnabled,
      );
      expect(placeholder?.walletAddress).toBe(WALLET_A);
      expect(placeholder?.isMoneyAccountEntry).toBe(true);
    });
  });
});

describe('selectCardFundingTokens', () => {
  beforeEach(() => {
    mockSelectMoneyAccounts.mockReturnValue({});
  });

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

  it('flags tokens whose walletAddress matches a money account and leaves others false', () => {
    mockSelectMoneyAccounts.mockReturnValue({
      'ma-1': { address: mockPrimaryAsset.walletAddress },
    });
    const cardHomeData: CardHomeData = {
      ...mockCardHomeData,
      fundingAssets: [
        mockPrimaryAsset,
        {
          ...mockPrimaryAsset,
          symbol: 'USDT',
          walletAddress: '0xotherwallet0000000000000000000000000000099',
          address: '0xusdt000000000000000000000000000000000003',
        },
      ],
    };
    const state = createMockRootState({
      cardHomeData:
        cardHomeData as unknown as CardControllerState['cardHomeData'],
    });
    const tokens = selectCardFundingTokens(state);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.isMoneyAccountEntry).toBe(true);
    expect(tokens[1]?.isMoneyAccountEntry).toBe(false);
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

describe('selectCardHasApprovedLineaFunding', () => {
  it('returns false when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardHasApprovedLineaFunding(state)).toBe(false);
  });

  it('returns true when a Linea funding asset is approved', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectCardHasApprovedLineaFunding(state)).toBe(true);
  });

  it('returns false when Linea funding assets are inactive', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        fundingAssets: [
          {
            ...mockPrimaryAsset,
            status: FundingAssetStatus.Inactive,
          },
        ],
      } as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectCardHasApprovedLineaFunding(state)).toBe(false);
  });

  it('returns false when approved funding assets are not on Linea', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        fundingAssets: [
          {
            ...mockPrimaryAsset,
            chainId: 'eip155:8453',
            status: FundingAssetStatus.Active,
          },
        ],
      } as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectCardHasApprovedLineaFunding(state)).toBe(false);
  });
});

describe('selectCardLineaUsdcToken', () => {
  it('returns null when cardHomeData is null', () => {
    const state = createMockRootState({ cardHomeData: null });
    expect(selectCardLineaUsdcToken(state)).toBeNull();
  });

  it('returns the USDC token on Linea from available funding assets', () => {
    const state = createMockRootState({
      cardHomeData:
        mockCardHomeData as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectCardLineaUsdcToken(state)).toEqual(
      expect.objectContaining({
        symbol: 'USDC',
        caipChainId: 'eip155:59144',
        fundingStatus: FundingStatus.Limited,
      }),
    );
  });

  it('returns null when USDC is not available on Linea', () => {
    const state = createMockRootState({
      cardHomeData: {
        ...mockCardHomeData,
        fundingAssets: [
          {
            ...mockPrimaryAsset,
            symbol: 'USDC',
            chainId: 'eip155:8453',
          },
        ],
      } as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectCardLineaUsdcToken(state)).toBeNull();
  });

  describe('placeholder synthesis from delegationSettings', () => {
    const WALLET_A = '0xwalletA000000000000000000000000000000001';

    const cardHomeDataWithDelegationOnly = {
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

    it('stamps the synthesized placeholder with the current EVM wallet address', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue({ address: WALLET_A }),
      );
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithDelegationOnly as unknown as CardControllerState['cardHomeData'],
      });

      const token = selectCardLineaUsdcToken(state);
      expect(token).toEqual(
        expect.objectContaining({
          symbol: 'USDC',
          caipChainId: 'eip155:59144',
          fundingStatus: FundingStatus.NotEnabled,
          walletAddress: WALLET_A,
        }),
      );
    });

    it('returns the placeholder unstamped when no EVM account is selected', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        jest.fn().mockReturnValue(undefined),
      );
      const state = createMockRootState({
        cardHomeData:
          cardHomeDataWithDelegationOnly as unknown as CardControllerState['cardHomeData'],
      });

      const token = selectCardLineaUsdcToken(state);
      expect(token).toEqual(
        expect.objectContaining({
          symbol: 'USDC',
          caipChainId: 'eip155:59144',
          fundingStatus: FundingStatus.NotEnabled,
        }),
      );
      expect(token?.walletAddress).toBeUndefined();
    });
  });
});

describe('selectIsMoneyAccountDelegatedForCard', () => {
  const MA_ADDRESS = '0xma000000000000000000000000000000000000aa';

  // Explicit `CardFundingAsset` annotation (instead of `as const`) so override
  // tests can pass any valid `FundingAssetStatus`, chain id, or wallet
  // address through `homeDataWithMonadUsdc` without TS rejecting the literal
  // mismatch.
  const monadUsdcAsset: CardFundingAsset = {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xusdc000000000000000000000000000000000005',
    walletAddress: MA_ADDRESS,
    decimals: 6,
    chainId: 'eip155:143',
    spendableBalance: '0',
    spendingCap: '0',
    priority: 1,
    status: FundingAssetStatus.Active,
  };

  const homeDataWithMonadUsdc = (
    overrides: Partial<CardFundingAsset> = {},
  ): CardHomeData => ({
    ...mockCardHomeData,
    fundingAssets: [{ ...monadUsdcAsset, ...overrides }],
  });

  beforeEach(() => {
    mockSelectPrimaryMoneyAccount.mockReset();
  });

  it('returns false when there is no primary Money Account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);
    const state = createMockRootState({
      cardHomeData:
        homeDataWithMonadUsdc() as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns false when there are no funding assets', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({ cardHomeData: null });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns true when the primary Money Account has an active Monad USDC funding row', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({
      cardHomeData:
        homeDataWithMonadUsdc() as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(true);
  });

  it('returns true when the matching row has Limited (partial allowance) status', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({
      cardHomeData: homeDataWithMonadUsdc({
        status: FundingAssetStatus.Limited,
      }) as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(true);
  });

  it('returns false when the matching row is Inactive (NotEnabled)', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({
      cardHomeData: homeDataWithMonadUsdc({
        status: FundingAssetStatus.Inactive,
      }) as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns false when the wallet address on the funding row does not match the Money Account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({
      cardHomeData: homeDataWithMonadUsdc({
        walletAddress: '0xother000000000000000000000000000000000099',
      }) as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('returns false when the Money Account row is on a different chain than Monad', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: MA_ADDRESS });
    const state = createMockRootState({
      cardHomeData: homeDataWithMonadUsdc({
        chainId: 'eip155:59144',
      }) as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(false);
  });

  it('matches addresses case-insensitively', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MA_ADDRESS.toUpperCase(),
    });
    const state = createMockRootState({
      cardHomeData:
        homeDataWithMonadUsdc() as unknown as CardControllerState['cardHomeData'],
    });

    expect(selectIsMoneyAccountDelegatedForCard(state)).toBe(true);
  });
});
