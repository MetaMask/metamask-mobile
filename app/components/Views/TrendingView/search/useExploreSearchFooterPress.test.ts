import { renderHook } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { analytics } from '../../../../util/analytics/analytics';
import type { SearchFooterAction } from '../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { useExploreSearchFooterPress } from './useExploreSearchFooterPress';

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockTrackEvent = jest.mocked(analytics.trackEvent);

describe('useExploreSearchFooterPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['open_url', 'metamask.io'],
    ['engine_search', 'https://search.brave.com/search?q=metamask.io'],
  ] satisfies [SearchFooterAction, string][])(
    'tracks result_clicked for %s and opens the url in the browser',
    (action, url) => {
      const { result } = renderHook(() =>
        useExploreSearchFooterPress({
          searchQuery: 'metamask.io',
          tabName: 'all',
          resultCount: 7,
        }),
      );

      result.current(url, action);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const event = mockTrackEvent.mock.calls[0][0];
      expect(event.name).toBe(
        MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
      );
      expect(event.properties).toEqual({
        interaction_type: 'result_clicked',
        search_query: 'metamask.io',
        section_name: 'search_footer',
        tab_name: 'all',
        item_clicked: action,
        result_count: 7,
        query_length: 11,
      });
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: expect.objectContaining({
          newTabUrl: url,
          fromTrending: true,
          entryPoint: 'explore_search',
        }),
      });
    },
  );

  it('reports the active feed pill as tab_name', () => {
    const { result } = renderHook(() =>
      useExploreSearchFooterPress({
        searchQuery: 'uniswap',
        tabName: 'sites',
        resultCount: 2,
      }),
    );

    result.current(
      'https://search.brave.com/search?q=uniswap',
      'engine_search',
    );

    expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
      expect.objectContaining({ tab_name: 'sites', result_count: 2 }),
    );
  });
});
