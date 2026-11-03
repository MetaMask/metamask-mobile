import { MetaMetricsEvents } from '../../core/Analytics';
import { analytics } from './analytics';
import { trackHomepageSearchPaste } from './homepageSearchPasteTracking';

jest.mock('./analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

describe('trackHomepageSearchPaste', () => {
  it('tracks the homepage paste interaction without the clipboard value', () => {
    trackHomepageSearchPaste();

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
        properties: {
          interaction_type: 'paste',
          entry_point: 'home',
        },
      }),
    );
  });

  it('adds the search session id when the paste happens inside a search session', () => {
    trackHomepageSearchPaste('search-session-id');

    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          interaction_type: 'paste',
          entry_point: 'home',
          search_session_id: 'search-session-id',
        },
      }),
    );
  });
});
