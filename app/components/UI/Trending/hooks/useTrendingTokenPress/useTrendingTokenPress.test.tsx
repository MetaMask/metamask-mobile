import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import {
  act,
  renderHook as renderHookBase,
} from '@testing-library/react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';

import Logger from '../../../../../util/Logger';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { useAddPopularNetwork } from '../../../../hooks/useAddPopularNetwork';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';
import {
  TimeOption,
  PriceChangeOption,
} from '../../components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../components/TrendingTokensList/TrendingTokensList';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTrendingTokenPress } from './useTrendingTokenPress';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});
notifyManager.setNotifyFunction((callback) => {
  act(callback);
});

jest.mock('@react-navigation/native', () => ({
  StackActions: { push: jest.fn((route, params) => ({ route, params })) },
  useNavigation: jest.fn(),
}));
jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));
jest.mock('../../../../hooks/useAddPopularNetwork');
jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));
jest.mock('../../services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn(() => ({}));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigationDispatch = jest.fn();
const mockTrackTokenClick = jest.fn();
const mockUseSelector = jest.mocked(useSelector);
const mockUseNavigation = jest.mocked(useNavigation);
const mockUseAddPopularNetwork = jest.mocked(useAddPopularNetwork);
const mockGetInstance = jest.mocked(TrendingFeedSessionManager.getInstance);

const avalancheNetwork = PopularList.find((n) => n.nickname === 'Avalanche');
if (!avalancheNetwork) {
  throw new Error('Avalanche missing from PopularList');
}
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
  assetId: 'eip155:43114/erc20:0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX',
  name: 'Wrapped AVAX',
  decimals: 18,
  price: '20',
} as unknown as TrendingAsset;

const FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.PriceChange,
  networkFilter: 'all',
  isSearchResult: false,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });

const teardownQueryClient = async (queryClient: QueryClient) => {
  await act(async () => {
    queryClient
      .getMutationCache()
      .getAll()
      .forEach((mutation) => {
        mutation.destroy();
      });
    await queryClient.cancelQueries();
  });
  queryClient.getMutationCache().clear();
  queryClient.getQueryCache().clear();
  queryClient.clear();
};

describe('useTrendingTokenPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const arrangeTest = (
    configure?: (mocks: {
      addPopularNetwork: jest.Mock;
      mockSelector: typeof mockUseSelector;
    }) => void,
  ) => {
    const addPopularNetwork = jest.fn().mockResolvedValue(undefined);

    mockUseAddPopularNetwork.mockReturnValue({ addPopularNetwork });
    mockUseNavigation.mockReturnValue({
      dispatch: mockNavigationDispatch,
    } as never);
    mockGetInstance.mockReturnValue({
      trackTokenClick: mockTrackTokenClick,
    } as never);
    mockUseSelector.mockReturnValue({});
    configure?.({ addPopularNetwork, mockSelector: mockUseSelector });

    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return {
      addPopularNetwork,
      renderHook: (params: Parameters<typeof useTrendingTokenPress>[0]) => {
        const rendered = renderHookBase(() => useTrendingTokenPress(params), {
          wrapper,
        });
        const unmountHook = rendered.unmount;

        return {
          ...rendered,
          cleanup: async () => {
            unmountHook();
            await teardownQueryClient(queryClient);
          },
        };
      },
    };
  };

  describe('navigation', () => {
    it('navigates without adding a network when the chain is already configured', async () => {
      const { addPopularNetwork, renderHook } = arrangeTest(
        ({ mockSelector }) => {
          mockSelector.mockReturnValue({
            [AVAX_CHAIN_ID as Hex]: { name: 'Avalanche' },
          });
        },
      );

      const { result, cleanup } = renderHook({ token: AVAX_TOKEN });

      await act(async () => {
        await result.current.onPress();
      });

      expect(addPopularNetwork).not.toHaveBeenCalled();
      expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
      expect(StackActions.push).toHaveBeenCalledWith(
        'Asset',
        expect.objectContaining({ symbol: 'WAVAX', chainId: AVAX_CHAIN_ID }),
      );
      await cleanup();
    });

    it('navigates without adding a network for a chain outside PopularList', async () => {
      const { addPopularNetwork, renderHook } = arrangeTest();

      const { result, cleanup } = renderHook({ token: ETH_TOKEN });

      await act(async () => {
        await result.current.onPress();
      });

      expect(addPopularNetwork).not.toHaveBeenCalled();
      expect(StackActions.push).toHaveBeenCalledWith(
        'Asset',
        expect.objectContaining({ symbol: 'USDC', chainId: '0x1' }),
      );
      await cleanup();
    });

    it('adds the network from PopularList before navigating when the chain is not configured', async () => {
      const { addPopularNetwork, renderHook } = arrangeTest();

      const { result, cleanup } = renderHook({ token: AVAX_TOKEN });

      await act(async () => {
        await result.current.onPress();
      });

      expect(addPopularNetwork).toHaveBeenCalledWith(
        expect.objectContaining({ chainId: AVAX_CHAIN_ID }),
      );
      expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
      await cleanup();
    });

    it('does not navigate when addPopularNetwork rejects', async () => {
      const addError = new Error('boom');
      const loggerErrorSpy = jest
        .spyOn(Logger, 'error')
        .mockImplementation(jest.fn());
      const { renderHook } = arrangeTest(({ addPopularNetwork }) => {
        addPopularNetwork.mockRejectedValueOnce(addError);
      });

      const { result, cleanup } = renderHook({ token: AVAX_TOKEN });

      await act(async () => {
        await result.current.onPress();
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(addError, {
        message: 'Failed to add missing network',
        chainId: AVAX_CHAIN_ID,
      });
      expect(mockNavigationDispatch).not.toHaveBeenCalled();
      await cleanup();
    });
  });

  describe('trending feed analytics', () => {
    it('tracks a token click when index and filterContext are provided', async () => {
      const { renderHook } = arrangeTest();

      const { result, cleanup } = renderHook({
        token: ETH_TOKEN,
        index: 4,
        filterContext: FILTER_CONTEXT,
      });

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
      await cleanup();
    });

    it('skips trending feed analytics when index or filterContext is missing', async () => {
      const { renderHook } = arrangeTest();

      const { result, cleanup } = renderHook({ token: ETH_TOKEN });

      await act(async () => {
        await result.current.onPress();
      });

      expect(mockTrackTokenClick).not.toHaveBeenCalled();
      await cleanup();
    });
  });

  describe('watchlist analytics', () => {
    it('tracks Token List Item Clicked for watchlist row taps', async () => {
      const { renderHook } = arrangeTest();

      const { result, cleanup } = renderHook({
        token: ETH_TOKEN,
        index: 1,
        tokenDetailsSource: TokenDetailsSource.WatchlistHomepage,
      });

      await act(async () => {
        await result.current.onPress();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_LIST_ITEM_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        asset: ETH_TOKEN.assetId,
        source: TokenDetailsSource.WatchlistHomepage,
        position: 1,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
      await cleanup();
    });
  });
});
