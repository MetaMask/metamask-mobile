import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokenListFilters } from './useTokenListFilters';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';
import type { CaipChainId } from '@metamask/utils';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

const mockTrackFilterChange = jest.fn();
jest.mock('../../services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      trackFilterChange: mockTrackFilterChange,
    }),
  },
}));

jest.mock('../useNetworkName/useNetworkName', () => ({
  useNetworkName: (network: CaipChainId[] | null) =>
    network && network.length > 0 ? 'Mock Network' : 'All networks',
}));

const renderFilters = (options = {}) =>
  renderHookWithProvider(() => useTokenListFilters(options));

describe('useTokenListFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns correct defaults', () => {
      const { result } = renderFilters();

      expect(result.current.selectedNetwork).toBeNull();
      expect(result.current.selectedPriceChangeOption).toBe(
        PriceChangeOption.PriceChange,
      );
      expect(result.current.priceChangeSortDirection).toBe(
        SortDirection.Descending,
      );
      expect(result.current.selectedTimeOption).toBe(
        TimeOption.TwentyFourHours,
      );
      expect(result.current.isSearchVisible).toBe(false);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.showNetworkBottomSheet).toBe(false);
      expect(result.current.showPriceChangeBottomSheet).toBe(false);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.selectedNetworkName).toBe('All networks');
    });

    it('uses provided timeOption instead of default', () => {
      const { result } = renderFilters({ timeOption: TimeOption.OneHour });

      expect(result.current.selectedTimeOption).toBe(TimeOption.OneHour);
    });
  });

  describe('handleBackPress', () => {
    it('calls navigation.goBack', () => {
      const { result } = renderFilters();

      act(() => result.current.handleBackPress());

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSearchToggle', () => {
    it('opens search on first toggle', () => {
      const { result } = renderFilters();

      act(() => result.current.handleSearchToggle());

      expect(result.current.isSearchVisible).toBe(true);
    });

    it('closes search and clears query on second toggle', () => {
      const { result } = renderFilters();

      act(() => result.current.handleSearchToggle());
      act(() => result.current.handleSearchQueryChange('test'));
      act(() => result.current.handleSearchToggle());

      expect(result.current.isSearchVisible).toBe(false);
      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('handlePriceChangeSelect', () => {
    it('updates price change option and sort direction', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handlePriceChangeSelect(
          PriceChangeOption.Volume,
          SortDirection.Ascending,
        ),
      );

      expect(result.current.selectedPriceChangeOption).toBe(
        PriceChangeOption.Volume,
      );
      expect(result.current.priceChangeSortDirection).toBe(
        SortDirection.Ascending,
      );
    });

    it('tracks analytics when option changes', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handlePriceChangeSelect(
          PriceChangeOption.MarketCap,
          SortDirection.Descending,
        ),
      );

      expect(mockTrackFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filter_type: 'sort',
          previous_value: PriceChangeOption.PriceChange,
          new_value: PriceChangeOption.MarketCap,
          sort_option: PriceChangeOption.MarketCap,
          network_filter: 'all',
        }),
      );
    });

    it('includes selected network in analytics when a network is active', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handleNetworkSelect(['eip155:137' as CaipChainId]),
      );
      mockTrackFilterChange.mockClear();

      act(() =>
        result.current.handlePriceChangeSelect(
          PriceChangeOption.Volume,
          SortDirection.Ascending,
        ),
      );

      expect(mockTrackFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          network_filter: 'eip155:137',
        }),
      );
    });

    it('does not track analytics when re-selecting same option', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handlePriceChangeSelect(
          PriceChangeOption.PriceChange,
          SortDirection.Ascending,
        ),
      );

      expect(mockTrackFilterChange).not.toHaveBeenCalled();
    });
  });

  describe('handlePriceChangePress', () => {
    it('opens price change bottom sheet', () => {
      const { result } = renderFilters();

      act(() => result.current.handlePriceChangePress());

      expect(result.current.showPriceChangeBottomSheet).toBe(true);
    });
  });

  describe('handleNetworkSelect', () => {
    it('updates selected network', () => {
      const { result } = renderFilters();
      const chainIds = ['eip155:1' as CaipChainId];

      act(() => result.current.handleNetworkSelect(chainIds));

      expect(result.current.selectedNetwork).toEqual(chainIds);
    });

    it('tracks analytics when network changes', () => {
      const { result } = renderFilters();
      const chainIds = ['eip155:137' as CaipChainId];

      act(() => result.current.handleNetworkSelect(chainIds));

      expect(mockTrackFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filter_type: 'network',
          previous_value: 'all',
          new_value: 'eip155:137',
          network_filter: 'eip155:137',
        }),
      );
    });

    it('does not track analytics when selecting same network', () => {
      const { result } = renderFilters();
      const chainIds = ['eip155:1' as CaipChainId];

      act(() => result.current.handleNetworkSelect(chainIds));
      mockTrackFilterChange.mockClear();

      act(() => result.current.handleNetworkSelect(chainIds));

      expect(mockTrackFilterChange).not.toHaveBeenCalled();
    });

    it('tracks analytics when clearing network back to all', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handleNetworkSelect(['eip155:1' as CaipChainId]),
      );
      mockTrackFilterChange.mockClear();

      act(() => result.current.handleNetworkSelect(null));

      expect(mockTrackFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_value: 'eip155:1',
          new_value: 'all',
        }),
      );
    });
  });

  describe('handleAllNetworksPress', () => {
    it('opens network bottom sheet', () => {
      const { result } = renderFilters();

      act(() => result.current.handleAllNetworksPress());

      expect(result.current.showNetworkBottomSheet).toBe(true);
    });
  });

  describe('priceChangeButtonText', () => {
    it('returns "Price change" for PriceChange option', () => {
      const { result } = renderFilters();

      expect(result.current.priceChangeButtonText).toBe('Price change');
    });

    it('returns "Volume" for Volume option', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handlePriceChangeSelect(
          PriceChangeOption.Volume,
          SortDirection.Descending,
        ),
      );

      expect(result.current.priceChangeButtonText).toBe('Volume');
    });

    it('returns "Market cap" for MarketCap option', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handlePriceChangeSelect(
          PriceChangeOption.MarketCap,
          SortDirection.Descending,
        ),
      );

      expect(result.current.priceChangeButtonText).toBe('Market cap');
    });
  });

  describe('filterContext', () => {
    it('reflects current filter state', () => {
      const { result } = renderFilters();

      expect(result.current.filterContext).toEqual({
        timeFilter: TimeOption.TwentyFourHours,
        sortOption: PriceChangeOption.PriceChange,
        networkFilter: 'all',
        isSearchResult: false,
      });
    });

    it('updates isSearchResult when search query has content', () => {
      const { result } = renderFilters();

      act(() => result.current.handleSearchQueryChange('eth'));

      expect(result.current.filterContext.isSearchResult).toBe(true);
    });

    it('updates networkFilter when a network is selected', () => {
      const { result } = renderFilters();

      act(() =>
        result.current.handleNetworkSelect(['eip155:42161' as CaipChainId]),
      );

      expect(result.current.filterContext.networkFilter).toBe('eip155:42161');
    });
  });
});
