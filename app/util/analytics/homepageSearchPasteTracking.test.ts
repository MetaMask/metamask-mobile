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
          search_query: '',
          entry_point: 'home',
        },
      }),
    );
  });
});
