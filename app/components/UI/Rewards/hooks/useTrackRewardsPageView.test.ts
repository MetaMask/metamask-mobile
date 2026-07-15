import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  createMockUseAnalyticsHook,
  createMockEventBuilder,
} from '../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import useTrackRewardsPageView from './useTrackRewardsPageView';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('../../../hooks/useAnalytics/useAnalytics');

describe('useTrackRewardsPageView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('tracks REWARDS_PAGE_VIEWED on mount', () => {
    renderHook(() => useTrackRewardsPageView({ page_type: 'home' }));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_PAGE_VIEWED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('includes page_type property in the event', () => {
    renderHook(() =>
      useTrackRewardsPageView({ page_type: 'campaigns_overview' }),
    );

    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith({
      page_type: 'campaigns_overview',
    });
  });

  it('includes campaign_id when provided', () => {
    renderHook(() =>
      useTrackRewardsPageView({
        page_type: 'ondo_campaign_detail',
        campaign_id: 'test-campaign-id',
      }),
    );

    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith({
      page_type: 'ondo_campaign_detail',
      campaign_id: 'test-campaign-id',
    });
  });

  it('does not include campaign_id when not provided', () => {
    renderHook(() => useTrackRewardsPageView({ page_type: 'home' }));

    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith({ page_type: 'home' });
    expect(builder.addProperties).not.toHaveBeenCalledWith(
      expect.objectContaining({ campaign_id: expect.anything() }),
    );
  });

  it('fires the event only once across re-renders with the same params', () => {
    const { rerender } = renderHook(
      (props: { page_type: string }) => useTrackRewardsPageView(props),
      { initialProps: { page_type: 'home' } },
    );

    rerender({ page_type: 'home' });
    rerender({ page_type: 'home' });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('re-fires when campaign_id changes on the same component instance', () => {
    const { rerender } = renderHook(
      (props: { page_type: string; campaign_id?: string }) =>
        useTrackRewardsPageView(props),
      {
        initialProps: {
          page_type: 'ondo_campaign_detail',
          campaign_id: 'campaign-a',
        },
      },
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    rerender({ page_type: 'ondo_campaign_detail', campaign_id: 'campaign-b' });

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    const secondBuilder = mockCreateEventBuilder.mock.results[1].value;
    expect(secondBuilder.addProperties).toHaveBeenCalledWith({
      page_type: 'ondo_campaign_detail',
      campaign_id: 'campaign-b',
    });
  });
});
