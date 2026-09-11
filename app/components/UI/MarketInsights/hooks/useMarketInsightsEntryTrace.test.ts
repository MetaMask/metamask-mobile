import { renderHook } from '@testing-library/react-native';
import { useMarketInsightsEntryTrace } from './useMarketInsightsEntryTrace';

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

const defaultParams = {
  assetIdentifier: 'eip155:1/erc20:0x123',
  assetType: 'token' as const,
  cacheState: 'cold' as const,
  enabled: true,
  error: null,
  isLoading: true,
  report: null,
  source: 'token_details' as const,
};

describe('useMarketInsightsEntryTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts entry-card time to content with bounded attributes', () => {
    const { result } = renderHook(() =>
      useMarketInsightsEntryTrace(defaultParams),
    );

    expect(result.current).toBe(
      'token_details:entry_card:eip155:1/erc20:0x123',
    );
    expect(mockTrace).toHaveBeenCalledWith({
      name: 'Market Insights Entry Card Load',
      op: 'market_insights.load',
      id: 'token_details:entry_card:eip155:1/erc20:0x123',
      tags: {
        feature: 'market_insights',
        source: 'token_details',
        stage: 'entry_card',
        asset_type: 'token',
        cache_state: 'cold',
      },
    });
  });

  it('does not end entry-card time to content while the query is loading', () => {
    renderHook(() => useMarketInsightsEntryTrace(defaultParams));

    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('ends entry-card time to content with an empty result', () => {
    renderHook(() =>
      useMarketInsightsEntryTrace({
        ...defaultParams,
        isLoading: false,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Market Insights Entry Card Load',
      id: 'token_details:entry_card:eip155:1/erc20:0x123',
      data: {
        result: 'empty',
        success: true,
        content_state: 'empty',
      },
    });
  });

  it('ends entry-card time to content with an error result', () => {
    renderHook(() =>
      useMarketInsightsEntryTrace({
        ...defaultParams,
        error: 'request failed',
        isLoading: false,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Market Insights Entry Card Load',
      id: 'token_details:entry_card:eip155:1/erc20:0x123',
      data: {
        result: 'error',
        success: false,
        content_state: 'error',
      },
    });
  });

  it('ends entry-card time to content as cancelled on unmount', () => {
    const { unmount } = renderHook(() =>
      useMarketInsightsEntryTrace(defaultParams),
    );

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Market Insights Entry Card Load',
      id: 'token_details:entry_card:eip155:1/erc20:0x123',
      data: {
        result: 'cancelled',
        success: false,
        reason: 'owner_cancelled',
      },
    });
  });

  it('does not start a trace when instrumentation is disabled', () => {
    const { result } = renderHook(() =>
      useMarketInsightsEntryTrace({
        ...defaultParams,
        enabled: false,
      }),
    );

    expect(result.current).toBe(
      'token_details:entry_card:eip155:1/erc20:0x123',
    );
    expect(mockTrace).not.toHaveBeenCalled();
  });
});
