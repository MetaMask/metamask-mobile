import { act, renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { EthAccountType } from '@metamask/keyring-api';
import { TokenDetailsSource } from '../../TokenDetails/constants/constants';
import Routes from '../../../../constants/navigation/Routes';
import type { DiscoveryEarnAsset, HeldEarnAsset } from '../types/earnAssets';
import useEarnOpportunityNavigation from './useEarnOpportunityNavigation';

const mockNavigate = jest.fn();
const assetAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockUseNavigation = jest.mocked(useNavigation);

const createEarnAsset = (fiatBalance: number): HeldEarnAsset => ({
  kind: 'held',
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  asset: {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: assetAddress,
    address: assetAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: String(fiatBalance),
    rawBalance: fiatBalance > 0 ? '0x1' : '0x0',
    fiat: {
      balance: fiatBalance,
      currency: 'USD',
      conversionRate: 1,
    },
    isNative: false,
  } as unknown as HeldEarnAsset['asset'],
  experiences: [],
});

const createDiscoveryEarnAsset = (): DiscoveryEarnAsset => ({
  kind: 'discovery',
  assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7' as const,
  metadata: {
    address: assetAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdt.png',
    name: 'Tether USD',
    symbol: 'USDT',
    logo: 'usdt.png',
    isETH: false,
  },
  experiences: [],
});

describe('useEarnOpportunityNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('navigates an asset at the minimum deposit to strategy selection', () => {
    const earnAsset = createEarnAsset(0.01);
    const { result } = renderHook(() =>
      useEarnOpportunityNavigation({
        tokenDetailsSource: TokenDetailsSource.ExploreEarn,
      }),
    );

    act(() => {
      result.current.navigateToEarnOpportunity(earnAsset);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
      screen: Routes.EARN.STRATEGY_SELECTION,
      params: { assetId: earnAsset.assetId },
    });
  });

  it('navigates an asset below the minimum deposit to Token Details', () => {
    const earnAsset = createEarnAsset(0);
    const { result } = renderHook(() =>
      useEarnOpportunityNavigation({
        tokenDetailsSource: TokenDetailsSource.ExploreEarn,
      }),
    );

    act(() => {
      result.current.navigateToEarnOpportunity(earnAsset);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: assetAddress,
        chainId: earnAsset.asset.chainId,
        source: TokenDetailsSource.ExploreEarn,
      }),
    );
  });

  it('navigates a discovery asset to Token Details', () => {
    const earnAsset = createDiscoveryEarnAsset();
    const { result } = renderHook(() =>
      useEarnOpportunityNavigation({
        tokenDetailsSource: TokenDetailsSource.ExploreEarn,
      }),
    );

    act(() => {
      result.current.navigateToEarnOpportunity(earnAsset);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: earnAsset.metadata.address,
        chainId: earnAsset.metadata.chainId,
        source: TokenDetailsSource.ExploreEarn,
      }),
    );
  });
});
