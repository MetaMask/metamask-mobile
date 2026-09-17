import { act, renderHook } from '@testing-library/react-native';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../types/earnAssets';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';
import useEarnSectionAssets from './useEarnSectionAssets';

jest.mock('./useEarnAssetCatalogue');

const mockUseEarnAssetCatalogue = useEarnAssetCatalogue as jest.MockedFunction<
  typeof useEarnAssetCatalogue
>;

type EarnAssetCatalogueResult = ReturnType<typeof useEarnAssetCatalogue>;

const createEarnExperience = (
  id: string,
  percentage = 5,
  status: EarnExperience['rate']['status'] = 'ready',
): EarnExperience => ({
  id,
  type: 'MONEY_ACCOUNT_DEPOSIT',
  role: 'funding',
  depositReadiness: { status: 'ready' },
  rate:
    status === 'ready'
      ? { type: 'APY', status, percentage }
      : { type: 'APY', status },
  isFeeSubsidized: false,
});

const createEarnAsset = ({
  symbol = 'USDC',
  balance = 10,
  tracked = true,
  index = 0,
  rate = 5,
}: {
  symbol?: string;
  balance?: number;
  tracked?: boolean;
  index?: number;
  rate?: number;
} = {}): EarnAsset => {
  const address = `0x${String(index + 1).padStart(40, '0')}`;
  const assetId = `eip155:1/erc20:${address}` as EarnAssetId;
  const walletAsset = {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: address,
    address,
    chainId: '0x1',
    decimals: 6,
    image: `${symbol.toLowerCase()}.png`,
    name: symbol === 'USDC' ? 'USD Coin' : symbol,
    symbol,
    balance: String(balance),
    rawBalance:
      balance > 0
        ? `0x${BigInt(Math.round(balance * 10 ** 6)).toString(16)}`
        : '0x0',
    fiat: { balance, currency: 'USD', conversionRate: 1 },
    isNative: false,
  } as Asset;

  return {
    assetId,
    metadata: {
      address,
      chainId: '0x1',
      decimals: 6,
      image: `${symbol.toLowerCase()}.png`,
      name: symbol === 'USDC' ? 'USD Coin' : symbol,
      symbol,
      ticker: symbol,
      logo: `${symbol.toLowerCase()}.png`,
      isETH: false,
      isNative: false,
    },
    wallet: tracked
      ? { status: 'tracked', asset: walletAsset }
      : { status: 'untracked' },
    experiences: [
      {
        ...createEarnExperience(`money:${assetId}`, rate),
        depositReadiness: tracked
          ? { status: 'ready' }
          : { status: 'not_ready', reason: 'asset_not_tracked' },
      },
    ],
  };
};

const createCatalogueResult = (
  overrides: Partial<EarnAssetCatalogueResult> = {},
): EarnAssetCatalogueResult => ({
  assets: [
    createEarnAsset({ symbol: 'USDT', tracked: false, rate: 6 }),
    createEarnAsset({ symbol: 'USDC', balance: 10, rate: 5, index: 1 }),
  ],
  isLoading: false,
  hasError: false,
  errors: [],
  refresh: jest.fn().mockResolvedValue(undefined),
  moneyApyDecimal: undefined,
  moneyApyPercent: undefined,
  moneyRateStatus: 'unavailable',
  ...overrides,
});

describe('useEarnSectionAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEarnAssetCatalogue.mockReturnValue(createCatalogueResult());
  });

  it('returns positive-balance assets before discovery assets in section slots', () => {
    const { result } = renderHook(() => useEarnSectionAssets());

    expect(result.current.assetSlots[0]).toMatchObject({
      kind: 'asset',
      asset: { metadata: { symbol: 'USDC' } },
    });
    expect(
      result.current.assetSlots.filter(({ kind }) => kind === 'unavailable'),
    ).toHaveLength(3);
  });

  it('reports more assets when catalogue exceeds section limit', () => {
    const assets = Array.from({ length: 6 }, (_, index) =>
      createEarnAsset({ index, symbol: `TOKEN${index}`, tracked: false }),
    );
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ assets }),
    );

    const { result } = renderHook(() => useEarnSectionAssets());

    expect(result.current.assetSlots).toHaveLength(5);
    expect(result.current.hasMoreAssets).toBe(true);
  });

  it('forwards loading, errors, and Money APY state', () => {
    const error = new Error('Earn data unavailable');
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({
        isLoading: true,
        hasError: true,
        errors: [error],
        moneyApyPercent: 6.2,
        moneyRateStatus: 'loading',
        refresh,
      }),
    );

    const { result } = renderHook(() => useEarnSectionAssets());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);
    expect(result.current.errors).toEqual([error]);
    expect(result.current.moneyApyPercent).toBe(6.2);
    expect(result.current.moneyRateStatus).toBe('loading');
  });

  it('does not refresh the catalogue when rendered', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );

    renderHook(() => useEarnSectionAssets());

    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns the catalogue refresh function', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );

    const { result } = renderHook(() => useEarnSectionAssets());

    expect(result.current.refresh).toBe(refresh);
  });

  it('forwards enabled state to the catalogue hook', () => {
    renderHook(() => useEarnSectionAssets({ enabled: false }));

    expect(mockUseEarnAssetCatalogue).toHaveBeenCalledWith({ enabled: false });
  });

  it('invokes the catalogue refresh function', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnAssetCatalogue.mockReturnValue(
      createCatalogueResult({ refresh }),
    );
    const { result } = renderHook(() => useEarnSectionAssets());

    await act(async () => {
      await result.current.refresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
