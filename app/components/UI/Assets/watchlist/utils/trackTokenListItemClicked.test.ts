import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { UseAnalyticsHook } from '../../../../hooks/useAnalytics/useAnalytics.types';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import {
  isWatchlistTokenListItemSource,
  trackTokenListItemClicked,
} from './trackTokenListItemClicked';

describe('trackTokenListItemClicked', () => {
  const mockTrackEvent = jest.fn();
  const mockAddProperties = jest.fn().mockReturnThis();
  const mockBuild = jest.fn(() => ({ name: 'built-event' }));
  const mockCreateEventBuilder = jest.fn(() => ({
    addProperties: mockAddProperties,
    build: mockBuild,
  })) as unknown as UseAnalyticsHook['createEventBuilder'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks Token List Item Clicked with asset, source, and position', () => {
    trackTokenListItemClicked(mockTrackEvent, mockCreateEventBuilder, {
      asset: 'eip155:1/slip44:60',
      source: TokenDetailsSource.WatchlistHomepage,
      position: 2,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.TOKEN_LIST_ITEM_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      asset: 'eip155:1/slip44:60',
      source: TokenDetailsSource.WatchlistHomepage,
      position: 2,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'built-event' });
  });

  it('returns true for watchlist token list item sources', () => {
    expect(
      isWatchlistTokenListItemSource(TokenDetailsSource.WatchlistFullscreen),
    ).toBe(true);
    expect(
      isWatchlistTokenListItemSource(TokenDetailsSource.SwapWatchlistFilter),
    ).toBe(true);
    expect(isWatchlistTokenListItemSource(TokenDetailsSource.Trending)).toBe(
      false,
    );
  });
});
