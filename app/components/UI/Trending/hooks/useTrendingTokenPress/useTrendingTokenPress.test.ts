import { renderHook, act } from '@testing-library/react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingTokenPress } from './useTrendingTokenPress';
import { useAddPopularNetwork } from '../../../../hooks/useAddPopularNetwork';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';
import { PopularList } from '../../../../../util/networks/customNetworks';
import {
  TimeOption,
  PriceChangeOption,
} from '../../components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../components/TrendingTokensList/TrendingTokensList';

jest.mock('@react-navigation/native', () => ({
  StackActions: { push: jest.fn((route, params) => ({ route, params })) },
  useNavigation: jest.fn(),
}));
jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../hooks/useAddPopularNetwork');
// Short-circuit selector module — useSelector is mocked, so we don't need real selectors.
jest.mock('../../../../../selectors/networkController', () => ({
  selectNetworkConfigurationsByCaipChainId: jest.fn(),
}));
jest.mock('../../services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const mockNavigationDispatch = jest.fn();
const mockAddPopularNetwork = jest.fn();
const mockTrackTokenClick = jest.fn();
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseAddPopularNetwork = useAddPopularNetwork as jest.MockedFunction<
  typeof useAddPopularNetwork
>;
const mockGetInstance =
  TrendingFeedSessionManager.getInstance as jest.MockedFunction<
    typeof TrendingFeedSessionManager.getInstance
  >;

// EVM token assetId — caipChainIdToHex maps `eip155:43114` → `0xa86a`.
const avalancheNetwork = PopularList.find((n) => n.nickname === 'Avalanche');
if (!avalancheNetwork) throw new Error('Avalanche missing from PopularList');
const AVAX_CHAIN_ID = avalancheNetwork.chainId;
const ETH_TOKEN: TrendingAsset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  price: '1',
  priceChangePct: { h24: '2.5' },
} as unknown as TrendingAsset;

const AVAX_TOKEN: TrendingAsset = {
  assetId: `eip155:43114/erc20:0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7`,
  symbol: 'WAVAX',
  name: 'Wrapped AVAX',
  decimals: 18,
  price: '20',
} as unknown as TrendingAsset;

describe('useTrendingTokenPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      dispatch: mockNavigationDispatch,
    } as never);
    mockUseAddPopularNetwork.mockReturnValue({
      addPopularNetwork: mockAddPopularNetwork,
    } as never);
    mockGetInstance.mockReturnValue({
      trackTokenClick: mockTrackTokenClick,
    } as never);
  });

  it('navigates without adding a network when the chain is already configured', async () => {
    // Network is already added — no call to addPopularNetwork.
    mockUseSelector.mockReturnValue({ 'eip155:1': { name: 'Mainnet' } });

    const { result } = renderHook(() =>
      useTrendingTokenPress({ token: ETH_TOKEN }),
    );
    await act(async () => {
      await result.current.onPress();
    });

    expect(mockAddPopularNetwork).not.toHaveBeenCalled();
    expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
    expect(StackActions.push).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({ symbol: 'USDC', chainId: '0x1' }),
    );
  });

  it('adds the network from PopularList before navigating when the chain is not configured', async () => {
    mockUseSelector.mockReturnValue({}); // no networks configured
    mockAddPopularNetwork.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useTrendingTokenPress({ token: AVAX_TOKEN }),
    );
    await act(async () => {
      await result.current.onPress();
    });

    expect(mockAddPopularNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: AVAX_CHAIN_ID }),
    );
    expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
  });

  it('aborts navigation when addPopularNetwork throws', async () => {
    mockUseSelector.mockReturnValue({});
    mockAddPopularNetwork.mockRejectedValueOnce(new Error('boom'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      /* silence */
    });

    const { result } = renderHook(() =>
      useTrendingTokenPress({ token: AVAX_TOKEN }),
    );
    await act(async () => {
      await result.current.onPress();
    });

    expect(mockAddPopularNetwork).toHaveBeenCalled();
    expect(mockNavigationDispatch).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('tracks an analytics event when index and filterContext are provided', async () => {
    mockUseSelector.mockReturnValue({ 'eip155:1': {} });
    const filterContext: TrendingFilterContext = {
      timeFilter: TimeOption.TwentyFourHours,
      sortOption: PriceChangeOption.PriceChange,
      networkFilter: 'all',
      isSearchResult: false,
    };

    const { result } = renderHook(() =>
      useTrendingTokenPress({
        token: ETH_TOKEN,
        index: 4,
        filterContext,
      }),
    );
    await act(async () => {
      await result.current.onPress();
    });

    expect(mockTrackTokenClick).toHaveBeenCalledTimes(1);
    expect(mockTrackTokenClick).toHaveBeenCalledWith(
      expect.objectContaining({
        token_symbol: 'USDC',
        position: 4,
        price_change_pct: 2.5,
        is_search_result: false,
      }),
    );
  });

  it('skips analytics when index or filterContext is missing', async () => {
    mockUseSelector.mockReturnValue({ 'eip155:1': {} });
    const { result } = renderHook(() =>
      useTrendingTokenPress({ token: ETH_TOKEN }),
    );
    await act(async () => {
      await result.current.onPress();
    });
    expect(mockTrackTokenClick).not.toHaveBeenCalled();
  });
});
