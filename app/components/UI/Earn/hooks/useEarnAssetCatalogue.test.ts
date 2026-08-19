import { act, renderHook } from '@testing-library/react-native';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { LendingMarket } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { MUSD_TOKEN_ADDRESS } from '../constants/musd';
import { type EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import Engine from '../../../../core/Engine';
import { selectEarnAssetCatalogueInputs } from '../../../../selectors/earnController/earn';
import { selectRelayFixedSpread } from '../../../../selectors/featureFlagController/confirmations';
import type { RelayFixedSpreadConfig } from '../../../Views/confirmations/utils/relayFixedSpread';
import useMoneyAccountVisibility from '../../Money/hooks/useMoneyAccountVisibility';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import type { MoneyDepositAsset } from '../../Money/selectors/depositTokens';
import useEarnSectionLendingMarkets from './useEarnSectionLendingMarkets';
import useEarnSectionTokenMetadata from './useEarnSectionTokenMetadata';
import useTronStakeApy, { FetchStatus } from './useTronStakeApy';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';

jest.mock('react-redux');
jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: jest.fn(),
}));
jest.mock('../../Money/hooks/useMoneyAccountVisibility');
jest.mock('../../Money/hooks/useMoneyVaultApy');
jest.mock('./useEarnSectionLendingMarkets');
jest.mock('./useEarnSectionTokenMetadata');
jest.mock('./useTronStakeApy');
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      EarnController: {
        refreshPooledStakingVaultApyAverages: jest.fn(),
      },
    },
  },
}));

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const AUSDC_ADDRESS = '0xbcca60bb61934080951369a648fb03df4f96263c';
const USDC_ASSET_ID = `eip155:1/erc20:${USDC_ADDRESS}`;
const ETH_ASSET_ID = 'eip155:1/slip44:60';
const POL_ASSET_ID = 'eip155:137/slip44:966';
const TRON_CHAIN_ID = 'tron:728126428';
const TRX_ASSET_ID = `${TRON_CHAIN_ID}/slip44:195`;

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockFormatAddressToAssetId = jest.mocked(formatAddressToAssetId);
const mockUseMoneyAccountVisibility =
  useMoneyAccountVisibility as jest.MockedFunction<
    typeof useMoneyAccountVisibility
  >;
const mockUseMoneyVaultApy = useMoneyVaultApy as jest.MockedFunction<
  typeof useMoneyVaultApy
>;
const mockUseEarnSectionLendingMarkets =
  useEarnSectionLendingMarkets as jest.MockedFunction<
    typeof useEarnSectionLendingMarkets
  >;
const mockUseEarnSectionTokenMetadata =
  useEarnSectionTokenMetadata as jest.MockedFunction<
    typeof useEarnSectionTokenMetadata
  >;
const mockUseTronStakeApy = useTronStakeApy as jest.MockedFunction<
  typeof useTronStakeApy
>;

const market: LendingMarket = {
  id: 'mainnet-aave-usdc',
  chainId: 1,
  protocol: LendingProtocol.AAVE,
  name: 'Aave USDC',
  address: '0x1111111111111111111111111111111111111111',
  netSupplyRate: 4.2,
  totalSupplyRate: 4.2,
  rewards: [],
  tvlUnderlying: '1000000',
  underlying: {
    address: USDC_ADDRESS,
    chainId: 1,
  },
  outputToken: {
    address: AUSDC_ADDRESS,
    chainId: 1,
  },
};

const moneyToken: MoneyDepositAsset = {
  accountType: EthAccountType.Eoa,
  accountId: 'account-id',
  assetId: USDC_ADDRESS,
  address: USDC_ADDRESS,
  chainId: '0x1',
  decimals: 6,
  image: 'usdc.png',
  name: 'USD Coin',
  symbol: 'USDC',
  balance: '10',
  isNative: false,
  rawBalance: '0x989680',
  fiat: {
    balance: 10,
    currency: 'USD',
    conversionRate: 1,
  },
} as MoneyDepositAsset;
const EMPTY_RELAY_FIXED_SPREAD_CONFIG: RelayFixedSpreadConfig = { routes: [] };
const RELAY_CONFIG_WITH_MONEY_DEPOSIT_ROUTE: RelayFixedSpreadConfig = {
  routes: [
    {
      sourceChain: '0x1',
      sourceToken: USDC_ADDRESS as `0x${string}`,
      targetChain: CHAIN_IDS.MONAD,
      targetToken: MUSD_TOKEN_ADDRESS as `0x${string}`,
    },
  ],
};

const createEarnToken = (
  address: string,
  role: 'underlying' | 'output',
): EarnTokenDetails =>
  ({
    address,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: role === 'underlying' ? 'USD Coin' : 'Aave USDC',
    symbol: role === 'underlying' ? 'USDC' : 'aUSDC',
    ticker: role === 'underlying' ? 'USDC' : 'aUSDC',
    balance: '1',
    logo: 'usdc.png',
    isETH: false,
    isNative: false,
    balanceMinimalUnit: '1000000',
    balanceFormatted: '1 USDC',
    balanceFiat: '$1.00',
    balanceFiatNumber: 1,
    isBalanceFiatAvailable: true,
    tokenUsdExchangeRate: 1,
    experience: {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: '4.2',
      market,
    },
    experiences: [
      {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '4.2',
        market,
      },
    ],
  }) as EarnTokenDetails;

const earnTokenToAsset = (token: EarnTokenDetails): Asset => {
  const shared = {
    accountId: 'account-id',
    assetId: token.address,
    chainId: token.chainId,
    decimals: token.decimals,
    image: token.image,
    name: token.name,
    symbol: token.symbol,
    balance: token.balance,
    rawBalance:
      `0x${BigInt(token.balanceMinimalUnit).toString(16)}` as `0x${string}`,
    fiat: {
      balance: token.balanceFiatNumber,
      currency: 'USD',
      conversionRate: token.tokenUsdExchangeRate,
    },
    isNative: token.isNative ?? false,
  };

  if (token.chainId?.startsWith('tron:')) {
    return {
      ...shared,
      accountType: token.accountType,
    } as Asset;
  }

  return {
    ...shared,
    accountType: EthAccountType.Eoa,
    address: token.address,
  } as Asset;
};

const refreshLendingMarkets = jest.fn();
const refreshLendingMetadata = jest.fn();
const refetchMoneyApy = jest.fn();
const refetchTrxApy = jest.fn();

const mockSelectorValues = ({
  isPooledStakingEnabled = true,
  isStablecoinLendingEnabled = true,
  isTrxStakingEnabled = false,
  earnTokens = [],
  earnOutputTokens = [],
  moneyDepositAssets = [moneyToken],
  assets,
  relayFixedSpread = EMPTY_RELAY_FIXED_SPREAD_CONFIG,
}: {
  isPooledStakingEnabled?: boolean;
  isStablecoinLendingEnabled?: boolean;
  isTrxStakingEnabled?: boolean;
  earnTokens?: EarnTokenDetails[];
  earnOutputTokens?: EarnTokenDetails[];
  moneyDepositAssets?: MoneyDepositAsset[];
  assets?: Asset[];
  relayFixedSpread?: RelayFixedSpreadConfig;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRelayFixedSpread) return relayFixedSpread;
    if (selector === selectEarnAssetCatalogueInputs) {
      return {
        earnTokens,
        earnOutputTokens,
        lendingMarkets: [market],
        moneyDepositAssets,
        assets: assets ?? [
          ...moneyDepositAssets,
          ...earnTokens.map(earnTokenToAsset),
          ...earnOutputTokens.map(earnTokenToAsset),
        ],
        isEarnEligible: true,
        isPooledStakingEnabled,
        isStablecoinLendingEnabled,
        isTrxStakingEnabled,
      };
    }
    return { apyPercentString: '3.1' };
  });
};

const mockDependencies = () => {
  mockSelectorValues();
  mockUseMoneyAccountVisibility.mockReturnValue({
    isMoneyAccountVisible: true,
  });
  mockUseMoneyVaultApy.mockReturnValue({
    apyDecimal: 0.062,
    apyPercent: 6.2,
    apyPercentFormatted: '6.2%',
    vaultApyQuery: {
      isLoading: false,
      isError: false,
      refetch: refetchMoneyApy,
    },
  } as unknown as ReturnType<typeof useMoneyVaultApy>);
  mockUseEarnSectionLendingMarkets.mockReturnValue({
    markets: [market],
    isLoading: false,
    error: null,
    refresh: refreshLendingMarkets,
  });
  mockUseEarnSectionTokenMetadata.mockReturnValue({
    tokensByAssetId: {
      [USDC_ASSET_ID]: {
        assetId: USDC_ASSET_ID,
        decimals: 6,
        iconUrl: 'usdc.png',
        name: 'USD Coin',
        symbol: 'USDC',
      },
    },
    isLoading: false,
    isSettled: true,
    error: null,
    refresh: refreshLendingMetadata,
  });
  mockUseTronStakeApy.mockReturnValue({
    fetchStatus: FetchStatus.Initial,
    errorMessage: null,
    apyDecimal: null,
    apyPercent: null,
    refetch: refetchTrxApy,
  });
};

describe('useEarnAssetCatalogue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReset();
    mockFormatAddressToAssetId.mockImplementation((_address, chainId) =>
      chainId === '0x1' ? ETH_ASSET_ID : POL_ASSET_ID,
    );
    refreshLendingMarkets.mockResolvedValue(undefined);
    refreshLendingMetadata.mockResolvedValue(undefined);
    refetchMoneyApy.mockResolvedValue(undefined);
    refetchTrxApy.mockResolvedValue(undefined);
    (
      Engine.context.EarnController
        .refreshPooledStakingVaultApyAverages as jest.MockedFunction<
        typeof Engine.context.EarnController.refreshPooledStakingVaultApyAverages
      >
    ).mockResolvedValue(undefined);
    mockDependencies();
  });

  it('merges Money and lending experiences for the same underlying asset', () => {
    const { result } = renderHook(() => useEarnAssetCatalogue());

    const usdc = result.current.assets.find(
      ({ assetId }) => assetId === USDC_ASSET_ID,
    );

    expect(usdc).toMatchObject({ kind: 'held', asset: moneyToken });
    expect(usdc?.experiences.map(({ type }) => type)).toEqual([
      'MONEY_ACCOUNT_DEPOSIT',
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    ]);
    expect(usdc?.experiences.map(({ rate }) => rate.type)).toEqual([
      'APY',
      'APY',
    ]);
    expect(
      usdc?.experiences.map(({ isFeeSubsidized }) => isFeeSubsidized),
    ).toEqual([false, false]);
  });

  it('marks Money deposit experiences with subsidized routes', () => {
    mockSelectorValues({
      relayFixedSpread: RELAY_CONFIG_WITH_MONEY_DEPOSIT_ROUTE,
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());
    const usdc = result.current.assets.find(
      ({ assetId }) => assetId === USDC_ASSET_ID,
    );

    expect(
      usdc?.experiences.find(({ type }) => type === 'MONEY_ACCOUNT_DEPOSIT')
        ?.isFeeSubsidized,
    ).toBe(true);
  });

  it('adds Money funding to every deposit token including native assets', () => {
    const polToken = {
      ...moneyToken,
      assetId: '0x0000000000000000000000000000000000000000',
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x89',
      name: 'Polygon Ecosystem Token',
      symbol: 'POL',
      isNative: true,
    } as MoneyDepositAsset;
    const ethToken = {
      ...moneyToken,
      assetId: '0x0000000000000000000000000000000000000000',
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      name: 'Ethereum',
      symbol: 'ETH',
      isNative: true,
    } as MoneyDepositAsset;
    mockSelectorValues({
      moneyDepositAssets: [moneyToken, polToken, ethToken],
    });
    mockFormatAddressToAssetId.mockImplementation((_address, chainId) =>
      chainId === '0x1' ? ETH_ASSET_ID : POL_ASSET_ID,
    );

    const { result } = renderHook(() => useEarnAssetCatalogue());

    [USDC_ASSET_ID, POL_ASSET_ID, ETH_ASSET_ID].forEach((expectedAssetId) => {
      const asset = result.current.assets.find(
        ({ assetId }) => assetId === expectedAssetId,
      );
      expect(
        asset?.experiences.some(({ type }) => type === 'MONEY_ACCOUNT_DEPOSIT'),
      ).toBe(true);
    });
  });

  it('omits unheld lending output tokens', () => {
    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(
      result.current.assets.some(
        ({ assetId }) => assetId === `eip155:1/erc20:${AUSDC_ADDRESS}`,
      ),
    ).toBe(false);
  });

  it('omits held output tokens without a valid earning experience', () => {
    mockSelectorValues({
      earnTokens: [],
      earnOutputTokens: [createEarnToken(AUSDC_ADDRESS, 'output')],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(
      result.current.assets.some(
        ({ assetId }) => assetId === `eip155:1/erc20:${AUSDC_ADDRESS}`,
      ),
    ).toBe(false);
  });

  it.each([
    {
      label: 'pooled staking',
      token: {
        ...createEarnToken(
          '0x0000000000000000000000000000000000000000',
          'output',
        ),
        isETH: true,
        isNative: true,
        experiences: [
          {
            type: EARN_EXPERIENCES.POOLED_STAKING,
            apr: '3.1',
          },
        ],
      } as EarnTokenDetails,
    },
    {
      label: 'TRX staking',
      token: {
        ...createEarnToken(TRX_ASSET_ID, 'output'),
        chainId: TRON_CHAIN_ID,
        experiences: [
          {
            type: EARN_EXPERIENCES.TRX_STAKING,
            apr: '4.5',
          },
        ],
      } as EarnTokenDetails,
    },
  ])('omits held $label output tokens', ({ token }) => {
    mockSelectorValues({
      isTrxStakingEnabled: true,
      earnTokens: [],
      earnOutputTokens: [token],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(
      result.current.assets
        .flatMap(({ experiences }) => experiences)
        .some(({ role }) => role === 'output'),
    ).toBe(false);
  });

  it('provides pooled-staking discovery when held ETH is unavailable', () => {
    mockSelectorValues({
      earnTokens: [],
      earnOutputTokens: [],
      moneyDepositAssets: [],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());
    const eth = result.current.assets.find(
      ({ assetId }) => assetId === ETH_ASSET_ID,
    );

    expect(eth).toMatchObject({
      kind: 'discovery',
      assetId: ETH_ASSET_ID,
      metadata: {
        ticker: 'ETH',
      },
    });
    expect(eth?.experiences).toEqual([
      expect.objectContaining({
        id: `pooled:${ETH_ASSET_ID}`,
        role: 'underlying',
        type: EARN_EXPERIENCES.POOLED_STAKING,
      }),
    ]);
  });

  it('deduplicates held and discovery pooled-staking experiences', () => {
    const ethToken = {
      ...createEarnToken(
        '0x0000000000000000000000000000000000000000',
        'underlying',
      ),
      name: 'Held Ethereum',
      isETH: true,
      isNative: true,
      symbol: 'ETH',
      ticker: 'ETH',
      balance: '2',
      balanceMinimalUnit: '2000000000000000000',
      experiences: [
        {
          type: EARN_EXPERIENCES.POOLED_STAKING,
          apr: '3.1',
        },
      ],
    } as unknown as EarnTokenDetails;
    mockSelectorValues({
      earnTokens: [ethToken],
      earnOutputTokens: [],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    const eth = result.current.assets.find(
      ({ assetId: candidateId }) => candidateId === 'eip155:1/slip44:60',
    );

    expect(eth).toMatchObject({
      kind: 'held',
      asset: {
        name: 'Held Ethereum',
        balance: '2',
        rawBalance: '0x1bc16d674ec80000',
      },
    });
    expect(eth?.experiences).toHaveLength(1);
    expect(eth?.experiences[0].rate.type).toBe('APR');
  });

  it('reports held Earn tokens missing from AssetsController', () => {
    const heldToken = createEarnToken(USDC_ADDRESS, 'underlying');
    mockSelectorValues({
      earnTokens: [heldToken],
      moneyDepositAssets: [],
      assets: [],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(result.current.hasError).toBe(true);
    expect(result.current.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Held Earn token has no matching AssetsController asset',
        }),
      ]),
    );
  });

  it('uses canonical TRX staking metadata for held and discovery assets', () => {
    const trxToken = {
      ...moneyToken,
      address: TRX_ASSET_ID,
      chainId: TRON_CHAIN_ID,
      name: 'TRON',
      symbol: 'TRX',
      ticker: 'TRX',
      decimals: 6,
      isNative: true,
      balanceMinimalUnit: '1000000',
      balanceFormatted: '1 TRX',
      balanceFiat: '$0.30',
      balanceFiatNumber: 0.3,
      isBalanceFiatAvailable: true,
      tokenUsdExchangeRate: 0.3,
      experience: {
        type: EARN_EXPERIENCES.TRX_STAKING,
        apr: '0',
      },
      experiences: [
        {
          type: EARN_EXPERIENCES.TRX_STAKING,
          apr: '0',
        },
      ],
    } as unknown as EarnTokenDetails;
    mockUseSelector.mockReset();
    mockSelectorValues({
      isPooledStakingEnabled: false,
      isTrxStakingEnabled: true,
      earnTokens: [trxToken],
    });
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Fetched,
      errorMessage: null,
      apyDecimal: '4.5',
      apyPercent: '4.5%',
      refetch: refetchTrxApy,
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());
    const trxAsset = result.current.assets.find(
      ({ assetId }) => assetId === TRX_ASSET_ID,
    );

    expect(trxAsset?.experiences).toEqual([
      {
        id: `trx-staking:${TRX_ASSET_ID}`,
        type: EARN_EXPERIENCES.TRX_STAKING,
        role: 'underlying',
        rate: {
          type: 'APR',
          percentage: 4.5,
          status: 'ready',
        },
        isFeeSubsidized: false,
        market: undefined,
      },
    ]);
    expect(trxAsset).toMatchObject({
      kind: 'held',
      asset: {
        rawBalance: '0xf4240',
        name: 'TRON',
      },
    });
  });

  it('provides TRX-staking discovery before held TRX is available', () => {
    mockSelectorValues({
      isPooledStakingEnabled: false,
      isTrxStakingEnabled: true,
      earnTokens: [],
      earnOutputTokens: [],
      moneyDepositAssets: [],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());
    const trx = result.current.assets.find(
      ({ assetId }) => assetId === TRX_ASSET_ID,
    );

    expect(trx).toMatchObject({
      kind: 'discovery',
      assetId: TRX_ASSET_ID,
      metadata: {
        ticker: 'TRX',
      },
    });
    expect(trx?.experiences[0]).toMatchObject({
      id: `trx-staking:${TRX_ASSET_ID}`,
      role: 'underlying',
      type: EARN_EXPERIENCES.TRX_STAKING,
    });
  });

  it('reports TRX APY loading while the witness request is fetching', () => {
    mockUseSelector.mockReset();
    mockSelectorValues({ isTrxStakingEnabled: true });
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Fetching,
      errorMessage: null,
      apyDecimal: null,
      apyPercent: null,
      refetch: refetchTrxApy,
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(result.current.isLoading).toBe(true);
    expect(
      result.current.assets.find(({ assetId }) => assetId === TRX_ASSET_ID)
        ?.experiences[0].rate.status,
    ).toBe('loading');
  });

  it('reports TRX APY errors when the witness request fails', () => {
    mockUseSelector.mockReset();
    mockSelectorValues({ isTrxStakingEnabled: true });
    mockUseTronStakeApy.mockReturnValue({
      fetchStatus: FetchStatus.Error,
      errorMessage: 'Witness unavailable',
      apyDecimal: null,
      apyPercent: null,
      refetch: refetchTrxApy,
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(result.current.hasError).toBe(true);
    expect(
      result.current.assets.find(({ assetId }) => assetId === TRX_ASSET_ID)
        ?.experiences[0].rate.status,
    ).toBe('error');
  });

  it('refreshes the TRX APY when TRX staking is enabled', async () => {
    mockUseSelector.mockReset();
    mockSelectorValues({ isTrxStakingEnabled: true });
    const { result } = renderHook(() => useEarnAssetCatalogue());

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchTrxApy).toHaveBeenCalledTimes(1);
  });

  it('reports missing lending decimals as an error', () => {
    mockUseEarnSectionTokenMetadata.mockReturnValue({
      tokensByAssetId: {
        [USDC_ASSET_ID]: {
          assetId: USDC_ASSET_ID,
          iconUrl: 'usdc.png',
          name: 'USD Coin',
          symbol: 'USDC',
        },
      },
      isLoading: false,
      isSettled: true,
      error: null,
      refresh: refreshLendingMetadata,
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(result.current.hasError).toBe(true);
  });

  it('reports initial lending metadata work as loading without an error', () => {
    mockUseEarnSectionTokenMetadata.mockReturnValue({
      tokensByAssetId: {},
      isLoading: true,
      isSettled: false,
      error: null,
      refresh: refreshLendingMetadata,
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('refreshes lending metadata with the other catalogue sources', async () => {
    const { result } = renderHook(() => useEarnAssetCatalogue());

    await act(async () => {
      await result.current.refresh();
    });

    expect(refreshLendingMetadata).toHaveBeenCalledTimes(1);
  });

  it('rejects refresh when an upstream refresh fails', async () => {
    refreshLendingMarkets.mockRejectedValue(new Error('Lending unavailable'));
    const { result } = renderHook(() => useEarnAssetCatalogue());

    const refreshPromise = act(async () => result.current.refresh());

    await expect(refreshPromise).rejects.toThrow('Lending unavailable');
  });
});
