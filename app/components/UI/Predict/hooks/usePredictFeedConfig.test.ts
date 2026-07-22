import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { DEFAULT_PREDICT_SPORTS_FEED_FLAG } from '../constants/flags';
import type { PredictFilterOption } from '../types';
import {
  usePredictFilterOptions,
  type UsePredictFilterOptionsResult,
} from './usePredictFilterOptions';
import { usePredictFeedConfig } from './usePredictFeedConfig';

jest.mock('./usePredictFilterOptions');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUsePredictFilterOptions =
  usePredictFilterOptions as jest.MockedFunction<
    typeof usePredictFilterOptions
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const createOption = (id: string): PredictFilterOption => ({
  id,
  label: id.toUpperCase(),
  source: 'related-tags',
  params: { tagSlugs: [id], order: 'volume24hr', status: 'open' },
});

const filterOptionsResult = (
  overrides: Partial<UsePredictFilterOptionsResult> = {},
): UsePredictFilterOptionsResult => ({
  filterOptions: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  ...overrides,
});

const ids = (filters: { id: string }[]) => filters.map((filter) => filter.id);

describe('usePredictFeedConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(DEFAULT_PREDICT_SPORTS_FEED_FLAG);
    mockUsePredictFilterOptions.mockReturnValue(filterOptionsResult());
  });

  describe('static feed config resolution', () => {
    it('returns a hydrated config for a known feed id', () => {
      const { result } = renderHook(() => usePredictFeedConfig('politics'));

      expect(result.current.status).toBe('ready');
      expect(result.current.feedId).toBe('politics');
      expect(result.current.titleKey).toBe('predict.category.politics');
      expect(result.current.header).toEqual({
        showBackButton: true,
        showSearchButton: true,
      });
      expect(result.current.tabs).toEqual([
        { id: 'all', titleKey: 'predict.category.politics' },
      ]);
    });

    it('returns a safe not-found state for an unknown feed id', () => {
      const { result } = renderHook(() => usePredictFeedConfig('nope'));

      expect(result.current.status).toBe('not-found');
      expect(result.current.feedId).toBeUndefined();
      expect(result.current.tabs).toEqual([]);
      expect(result.current.filters).toEqual([]);
      expect(result.current.activeFilter).toBeUndefined();
      expect(result.current.showTabBar).toBe(false);
    });

    it('returns a not-found state when no feed id is provided', () => {
      const { result } = renderHook(() => usePredictFeedConfig());

      expect(result.current.status).toBe('not-found');
    });
  });

  describe('tab bar visibility', () => {
    it('hides the tab bar for a single-tab feed but still renders its filters', () => {
      const { result } = renderHook(() => usePredictFeedConfig('politics'));

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.showTabBar).toBe(false);
      expect(ids(result.current.filters)).toContain('all');
    });

    it('shows the tab bar for a multi-tab feed', () => {
      const { result } = renderHook(() => usePredictFeedConfig('sports'));

      expect(result.current.tabs.length).toBeGreaterThan(1);
      expect(result.current.showTabBar).toBe(true);
    });
  });

  describe('static-only feeds', () => {
    it('hides the filter bar for the Live feed', () => {
      const { result } = renderHook(() => usePredictFeedConfig('live'));

      expect(result.current.showFilterBar).toBe(false);
    });

    it('exposes static filters and disables dynamic fetching', () => {
      const { result } = renderHook(() => usePredictFeedConfig('live'));

      expect(ids(result.current.filters)).toEqual(['live']);
      expect(result.current.filters[0].isDynamic).toBe(false);
      expect(result.current.activeFilter?.params).toEqual({
        status: 'open',
        order: 'volume24hr',
        limit: 10,
        live: true,
      });
      expect(result.current.dynamicFilters.status).toBe('idle');
      expect(mockUsePredictFilterOptions).toHaveBeenCalledWith(
        { source: 'related-tags' },
        { enabled: false },
      );
    });
  });

  describe('static + dynamic feeds', () => {
    it('merges static and dynamic filters once dynamic resolves', () => {
      mockUsePredictFilterOptions.mockReturnValue(
        filterOptionsResult({
          filterOptions: [createOption('elections'), createOption('trump')],
        }),
      );

      const { result } = renderHook(() => usePredictFeedConfig('politics'));

      expect(ids(result.current.filters)).toEqual([
        'all',
        'elections',
        'trump',
      ]);
      expect(result.current.dynamicFilters.status).toBe('ready');
      expect(result.current.filters[1]).toEqual({
        id: 'elections',
        label: 'ELECTIONS',
        params: {
          tagSlugs: ['elections'],
          order: 'volume24hr',
          status: 'open',
        },
        isDynamic: true,
      });
    });

    it('deduplicates dynamic filters that collide with a static filter id', () => {
      mockUsePredictFilterOptions.mockReturnValue(
        filterOptionsResult({
          filterOptions: [createOption('all'), createOption('elections')],
        }),
      );

      const { result } = renderHook(() => usePredictFeedConfig('politics'));

      expect(ids(result.current.filters)).toEqual(['all', 'elections']);
    });

    it('keeps static filters usable while dynamic filters are loading', () => {
      mockUsePredictFilterOptions.mockReturnValue(
        filterOptionsResult({ isLoading: true }),
      );

      const { result } = renderHook(() => usePredictFeedConfig('politics'));

      expect(ids(result.current.filters)).toEqual(['all']);
      expect(result.current.dynamicFilters.status).toBe('loading');
      expect(result.current.activeFilterId).toBe('all');
      expect(result.current.activeFilter?.id).toBe('all');
    });
  });

  describe('dynamic filter failure', () => {
    it('retains static filters and marks dynamic unavailable on error', () => {
      mockUsePredictFilterOptions.mockReturnValue(
        filterOptionsResult({ error: new Error('boom') }),
      );

      const { result } = renderHook(() => usePredictFeedConfig('politics'));

      expect(ids(result.current.filters)).toEqual(['all']);
      expect(result.current.dynamicFilters.status).toBe('unavailable');
    });

    it('marks dynamic unavailable when the related-tags list resolves empty', () => {
      mockUsePredictFilterOptions.mockReturnValue(
        filterOptionsResult({ filterOptions: [] }),
      );

      const { result } = renderHook(() => usePredictFeedConfig('politics'));

      expect(ids(result.current.filters)).toEqual(['all']);
      expect(result.current.dynamicFilters.status).toBe('unavailable');
    });
  });

  describe('related-tags base slug wiring', () => {
    it.each([
      ['politics', 'politics'],
      ['crypto', 'crypto'],
      ['trending', 'all'],
    ])(
      'passes baseTagSlug "%s" -> "%s" to usePredictFilterOptions',
      (feedId, expectedSlug) => {
        renderHook(() => usePredictFeedConfig(feedId));

        expect(mockUsePredictFilterOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'related-tags',
            baseTagSlug: expectedSlug,
          }),
          { enabled: true },
        );
      },
    );
  });

  describe('initial tab / filter resolution', () => {
    it('selects a valid initial tab from route params', () => {
      const { result } = renderHook(() =>
        usePredictFeedConfig('sports', { initialTabId: 'tennis' }),
      );

      expect(result.current.activeTabId).toBe('tennis');
    });

    it('falls back to the first tab for an invalid initial tab id', () => {
      const { result } = renderHook(() =>
        usePredictFeedConfig('sports', { initialTabId: 'curling' }),
      );

      expect(result.current.activeTabId).toBe('all');
    });

    it('selects a static initial filter immediately', () => {
      const { result } = renderHook(() =>
        usePredictFeedConfig('sports', { initialFilterId: 'props' }),
      );

      expect(result.current.activeFilterId).toBe('props');
      expect(result.current.activeFilter?.id).toBe('props');
      expect(result.current.activeFilter?.showLiveFirst).toBe(false);
    });

    it('marks sports games and league filters as live-first', () => {
      const { result } = renderHook(() =>
        usePredictFeedConfig('sports', {
          initialTabId: 'soccer',
          initialFilterId: 'mls',
        }),
      );

      expect(
        result.current.filters.find((filter) => filter.id === 'games'),
      ).toEqual(expect.objectContaining({ showLiveFirst: true }));
      expect(result.current.activeFilter).toEqual(
        expect.objectContaining({ id: 'mls', showLiveFirst: true }),
      );
    });

    it('falls back to the tab default for an invalid initial filter id', () => {
      const { result } = renderHook(() =>
        usePredictFeedConfig('sports', { initialFilterId: 'nope' }),
      );

      expect(result.current.activeFilterId).toBe('games');
    });
  });

  describe('late dynamic filter selection', () => {
    it('selects an initial dynamic filter once it appears', async () => {
      let optionsResult = filterOptionsResult({ isLoading: true });
      mockUsePredictFilterOptions.mockImplementation(() => optionsResult);

      const { result, rerender } = renderHook(() =>
        usePredictFeedConfig('politics', { initialFilterId: 'elections' }),
      );

      // While dynamic filters load, the default static filter stays selected.
      expect(result.current.activeFilterId).toBe('all');

      optionsResult = filterOptionsResult({
        filterOptions: [createOption('elections')],
      });
      rerender({});

      await waitFor(() => {
        expect(result.current.activeFilterId).toBe('elections');
      });
      expect(result.current.activeFilter?.isDynamic).toBe(true);
    });

    it('falls back to the default filter when the initial dynamic filter never appears', async () => {
      let optionsResult = filterOptionsResult({ isLoading: true });
      mockUsePredictFilterOptions.mockImplementation(() => optionsResult);

      const { result, rerender } = renderHook(() =>
        usePredictFeedConfig('politics', { initialFilterId: 'elections' }),
      );

      optionsResult = filterOptionsResult({ filterOptions: [] });
      rerender({});

      await waitFor(() => {
        expect(result.current.dynamicFilters.status).toBe('unavailable');
      });
      expect(result.current.activeFilterId).toBe('all');
    });
  });

  describe('selection setters', () => {
    it('resets the active filter to the new tab default when switching tabs', () => {
      const { result } = renderHook(() => usePredictFeedConfig('sports'));

      act(() => {
        result.current.setActiveFilterId('props');
      });
      expect(result.current.activeFilterId).toBe('props');

      act(() => {
        result.current.setActiveTabId('tennis');
      });

      expect(result.current.activeTabId).toBe('tennis');
      expect(result.current.activeFilterId).toBe('games');
    });

    it('selects an explicitly chosen filter', () => {
      const { result } = renderHook(() => usePredictFeedConfig('sports'));

      act(() => {
        result.current.setActiveFilterId('props');
      });

      expect(result.current.activeFilterId).toBe('props');
      expect(result.current.activeFilter?.id).toBe('props');
    });

    it('ignores an unknown tab id so selection stays in sync with content', () => {
      const { result } = renderHook(() => usePredictFeedConfig('sports'));

      act(() => {
        result.current.setActiveTabId('curling');
      });

      // The invalid id is rejected: the active tab is unchanged, so the tab
      // bar selection and the rendered filters/content stay consistent.
      expect(result.current.activeTabId).toBe('all');
      expect(ids(result.current.filters)).toEqual(['games', 'props']);

      act(() => {
        result.current.setActiveTabId('tennis');
      });
      expect(result.current.activeTabId).toBe('tennis');
    });

    it('ignores an unknown filter id so the chip matches the active filter', () => {
      const { result } = renderHook(() => usePredictFeedConfig('sports'));

      act(() => {
        result.current.setActiveFilterId('nope');
      });

      expect(result.current.activeFilterId).toBe('games');
      expect(result.current.activeFilter?.id).toBe('games');
    });
  });

  describe('route param changes after mount', () => {
    it('re-seeds the active tab when initialTabId changes on the same feed', () => {
      const { result, rerender } = renderHook(
        ({ initialTabId }: { initialTabId?: string }) =>
          usePredictFeedConfig('sports', { initialTabId }),
        { initialProps: { initialTabId: 'all' } },
      );

      expect(result.current.activeTabId).toBe('all');

      rerender({ initialTabId: 'tennis' });

      expect(result.current.activeTabId).toBe('tennis');
    });

    it('re-seeds the active filter when a static initialFilterId changes on the same feed', () => {
      const { result, rerender } = renderHook(
        ({ initialFilterId }: { initialFilterId?: string }) =>
          usePredictFeedConfig('sports', { initialFilterId }),
        {
          initialProps: { initialFilterId: undefined } as {
            initialFilterId?: string;
          },
        },
      );

      expect(result.current.activeFilterId).toBe('games');

      rerender({ initialFilterId: 'props' });

      expect(result.current.activeFilterId).toBe('props');
    });

    it('re-seeds a pending dynamic filter when initialFilterId changes and selects it once it appears', async () => {
      let optionsResult = filterOptionsResult();
      mockUsePredictFilterOptions.mockImplementation(() => optionsResult);

      const { result, rerender } = renderHook(
        ({ initialFilterId }: { initialFilterId?: string }) =>
          usePredictFeedConfig('politics', { initialFilterId }),
        {
          initialProps: { initialFilterId: undefined } as {
            initialFilterId?: string;
          },
        },
      );

      expect(result.current.activeFilterId).toBe('all');

      // Route updates to target a dynamic filter that has not loaded yet.
      optionsResult = filterOptionsResult({ isLoading: true });
      rerender({ initialFilterId: 'elections' });
      expect(result.current.activeFilterId).toBe('all');

      // Dynamic filters resolve and the pending route filter is selected.
      optionsResult = filterOptionsResult({
        filterOptions: [createOption('elections')],
      });
      rerender({ initialFilterId: 'elections' });

      await waitFor(() => {
        expect(result.current.activeFilterId).toBe('elections');
      });
    });

    it('keeps activeTabId consistent with the resolved feed after a feedId change', () => {
      const { result, rerender } = renderHook(
        ({ feedId }: { feedId: string }) => usePredictFeedConfig(feedId),
        { initialProps: { feedId: 'sports' } },
      );

      // Select a non-first tab so the prior id would be invalid in the next feed.
      act(() => {
        result.current.setActiveTabId('tennis');
      });
      expect(result.current.activeTabId).toBe('tennis');

      rerender({ feedId: 'politics' });

      // The exposed activeTabId must reflect the new (single-tab) feed and agree
      // with the rendered tabs/content, never the stale "tennis".
      expect(result.current.activeTabId).toBe('all');
      expect(result.current.tabs).toEqual([
        { id: 'all', titleKey: 'predict.category.politics' },
      ]);
      expect(result.current.activeFilterId).toBe('all');
    });
  });
});
