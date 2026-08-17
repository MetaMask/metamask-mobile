import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { LendingMarket } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { MUSD_TOKEN_ADDRESS } from '../constants/musd';
import { type EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import type { AssetType } from '../../../Views/confirmations/types/token';
import Engine from '../../../../core/Engine';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectEarnAssetCatalogueInputs } from '../../../../selectors/earnController/earn';
import { selectRelayFixedSpread } from '../../../../selectors/featureFlagController/confirmations';
import type { RelayFixedSpreadConfig } from '../../../Views/confirmations/utils/relayFixedSpread';
import useMoneyAccountVisibility from '../../Money/hooks/useMoneyAccountVisibility';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
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

const moneyToken: AssetType = {
  address: USDC_ADDRESS,
  chainId: '0x1',
  decimals: 6,
  image: 'usdc.png',
  name: 'USD Coin',
  symbol: 'USDC',
  balance: '10',
  logo: 'usdc.png',
  isETH: false,
  isNative: false,
  fiat: {
    balance: 10,
    currency: 'USD',
  },
};
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
    ...moneyToken,
    address,
    name: role === 'underlying' ? 'USD Coin' : 'Aave USDC',
    symbol: role === 'underlying' ? 'USDC' : 'aUSDC',
    ticker: role === 'underlying' ? 'USDC' : 'aUSDC',
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

const refreshLendingMarkets = jest.fn();
const refetchMoneyApy = jest.fn();
const refetchTrxApy = jest.fn();

const mockSelectorValues = ({
  isPooledStakingEnabled = true,
  isStablecoinLendingEnabled = true,
  isTrxStakingEnabled = false,
  earnTokens = [],
  earnOutputTokens = [],
  moneyDepositAssets = [moneyToken],
  relayFixedSpread = EMPTY_RELAY_FIXED_SPREAD_CONFIG,
}: {
  isPooledStakingEnabled?: boolean;
  isStablecoinLendingEnabled?: boolean;
  isTrxStakingEnabled?: boolean;
  earnTokens?: EarnTokenDetails[];
  earnOutputTokens?: EarnTokenDetails[];
  moneyDepositAssets?: AssetType[];
  relayFixedSpread?: RelayFixedSpreadConfig;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCurrentCurrency) return 'USD';
    if (selector === selectRelayFixedSpread) return relayFixedSpread;
    if (selector === selectEarnAssetCatalogueInputs) {
      return {
        earnTokens,
        earnOutputTokens,
        lendingMarkets: [market],
        moneyDepositAssets,
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
    error: null,
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
    refreshLendingMarkets.mockResolvedValue(undefined);
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

    expect(usdc).toMatchObject(moneyToken);
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
    const polToken: AssetType = {
      ...moneyToken,
      assetId: '0x0000000000000000000000000000000000000000',
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x89',
      name: 'Polygon Ecosystem Token',
      symbol: 'POL',
      ticker: 'POL',
      isNative: true,
    };
    const ethToken: AssetType = {
      ...moneyToken,
      assetId: ETH_ASSET_ID,
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      name: 'Ethereum',
      symbol: 'ETH',
      ticker: 'ETH',
      isETH: true,
      isNative: true,
    };
    mockSelectorValues({
      moneyDepositAssets: [moneyToken, polToken, ethToken],
    });
    mockFormatAddressToAssetId.mockReturnValue(POL_ASSET_ID);

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
      result.current.assets.some(({ address }) => address === AUSDC_ADDRESS),
    ).toBe(false);
  });

  it('omits held output tokens without a valid earning experience', () => {
    mockSelectorValues({
      earnTokens: [],
      earnOutputTokens: [createEarnToken(AUSDC_ADDRESS, 'output')],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(
      result.current.assets.some(({ address }) => address === AUSDC_ADDRESS),
    ).toBe(false);
  });

  it('deduplicates held and discovery pooled-staking experiences', () => {
    const ethToken = {
      ...createEarnToken(
        '0x0000000000000000000000000000000000000000',
        'underlying',
      ),
      isETH: true,
      isNative: true,
      symbol: 'ETH',
      ticker: 'ETH',
      experiences: [
        {
          type: EARN_EXPERIENCES.POOLED_STAKING,
          apr: '3.1',
        },
      ],
    } as EarnTokenDetails;
    mockSelectorValues({
      earnTokens: [ethToken],
      earnOutputTokens: [],
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    const eth = result.current.assets.find(
      ({ assetId: candidateId }) => candidateId === 'eip155:1/slip44:60',
    );

    expect(eth?.experiences).toHaveLength(1);
    expect(eth?.experiences[0].rate.type).toBe('APR');
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
    } as EarnTokenDetails;
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
      error: null,
    });

    const { result } = renderHook(() => useEarnAssetCatalogue());

    expect(result.current.hasError).toBe(true);
  });

  it('rejects refresh when an upstream refresh fails', async () => {
    refreshLendingMarkets.mockRejectedValue(new Error('Lending unavailable'));
    const { result } = renderHook(() => useEarnAssetCatalogue());

    const refreshPromise = act(async () => result.current.refresh());

    await expect(refreshPromise).rejects.toThrow('Lending unavailable');
  });
});
