import {
  getDigestCacheState,
  getDigestTraceEndData,
  isDigestObserverPending,
  withDigestFetchSpan,
} from './digestPerformance';
import { TraceName, TraceOperation } from './trace';

const mockSetAttribute = jest.fn();
const mockTrace = jest.fn((...args: unknown[]) => {
  const callback = args[1] as (context: {
    setAttribute: typeof mockSetAttribute;
  }) => unknown;
  return callback({ setAttribute: mockSetAttribute });
});

jest.mock('./trace', () => ({
  ...jest.requireActual('./trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
}));

describe('digestPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats a truthy cache payload as warm', () => {
    expect(getDigestCacheState({ headline: 'ok' })).toBe('warm');
  });

  it('treats a null or missing cache payload as cold', () => {
    expect(getDigestCacheState(null)).toBe('cold');
    expect(getDigestCacheState(undefined)).toBe('cold');
  });

  it('returns filled end data for a successful result', () => {
    expect(getDigestTraceEndData('success')).toEqual({
      result: 'success',
      success: true,
      content_state: 'filled',
    });
  });

  it('returns empty end data as a successful resolution', () => {
    expect(getDigestTraceEndData('empty')).toEqual({
      result: 'empty',
      success: true,
      content_state: 'empty',
    });
  });

  it('returns cancelled end data without a content state', () => {
    expect(getDigestTraceEndData('cancelled')).toEqual({
      result: 'cancelled',
      success: false,
      reason: 'owner_cancelled',
    });
  });

  it('stays pending until this observer has fetched', () => {
    expect(
      isDigestObserverPending({
        enabled: true,
        hasContent: false,
        isFetchedAfterMount: false,
      }),
    ).toBe(true);
  });

  it('is not pending after this observer has fetched without content', () => {
    expect(
      isDigestObserverPending({
        enabled: true,
        hasContent: false,
        isFetchedAfterMount: true,
      }),
    ).toBe(false);
  });

  it('marks a digest fetch as cancelled when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await withDigestFetchSpan(
      {
        name: TraceName.MarketInsightsFetch,
        op: TraceOperation.MarketInsightsFetch,
        tags: { feature: 'market_insights' },
      },
      controller.signal,
      async () => ({ headline: 'ok' }),
    );

    expect(mockSetAttribute).toHaveBeenCalledWith('result', 'cancelled');
    expect(mockSetAttribute).toHaveBeenCalledWith('success', false);
  });
});
