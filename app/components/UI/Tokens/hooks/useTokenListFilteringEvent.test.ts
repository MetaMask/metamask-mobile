import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenListFilteringEvent } from './useTokenListFilteringEvent';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../core/Analytics';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../hooks/useCurrentNetworkInfo');
jest.mock('../../../hooks/useAnalytics/useAnalytics');

describe('useTokenListFilteringEvent', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();

  const arrange = ({
    sort = { key: 'tokenFiatAmount', order: 'dsc' },
    networkFilter,
  }: {
    sort?: { key: string; order: string };
    networkFilter?: string;
  } = {}) => {
    jest.mocked(useSelector).mockReturnValue(sort);
    jest.mocked(useCurrentNetworkInfo).mockReturnValue({
      // One enabled network means a network filter; two means all networks.
      enabledNetworks: networkFilter
        ? [{ chainId: '0x1', enabled: true }]
        : [
            { chainId: '0x1', enabled: true },
            { chainId: '0x89', enabled: true },
          ],
      getNetworkInfo: () => ({
        caipChainId: networkFilter as string,
        networkName: 'Network',
      }),
    } as unknown as ReturnType<typeof useCurrentNetworkInfo>);
  };

  const track = (
    ...args: Parameters<ReturnType<typeof useTokenListFilteringEvent>>
  ) => {
    const { result } = renderHook(() => useTokenListFilteringEvent());
    result.current(...args);
    return mockAddProperties.mock.calls[0][0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue({
      build: jest.fn().mockReturnValue({ name: 'built' }),
    });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    arrange();
  });

  it('sends the event with the stored sort and network by default', () => {
    arrange({
      sort: { key: 'name', order: 'asc' },
      networkFilter: 'eip155:1',
    });

    const properties = track('searched', {
      searchQuery: '  ETH ',
      extra: { query_length: 3, result_count: 2 },
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.TOKEN_LIST_FILTERING_INTERACTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(properties).toEqual({
      interaction_type: 'searched',
      search_query: 'eth',
      network_filter: 'eip155:1',
      token_sort_preference: 'title',
      sort_direction: 'asc',
      query_length: 3,
      result_count: 2,
    });
  });

  it('omits the search query when it is empty', () => {
    expect(track('sorted', { searchQuery: '   ' })).not.toHaveProperty(
      'search_query',
      expect.anything(),
    );
  });

  it('uses the sort passed in over the stored one', () => {
    arrange({ sort: { key: 'tokenFiatAmount', order: 'dsc' } });

    const properties = track('sorted', {
      sort: { key: 'name', order: 'dsc' },
    });

    expect(properties).toEqual(
      expect.objectContaining({
        token_sort_preference: 'title',
        sort_direction: 'desc',
      }),
    );
  });

  it('uses an explicitly undefined network over the stored one', () => {
    arrange({ networkFilter: 'eip155:1' });

    const properties = track('network_switched', { networkFilter: undefined });

    expect(properties.network_filter).toBeUndefined();
  });

  it('uses the network passed in over the stored one', () => {
    arrange({ networkFilter: 'eip155:1' });

    const properties = track('network_switched', {
      networkFilter: 'eip155:137',
    });

    expect(properties.network_filter).toBe('eip155:137');
  });
});
