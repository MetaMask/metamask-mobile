import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { SocialFeedPageActiveContext } from '../components/SocialFeedPageActiveContext';
import { FEED_AGE_TICK_MS, useFeedAgeNow } from './useFeedAgeNow';

const START = new Date('2026-07-09T12:00:00Z').getTime();

describe('useFeedAgeNow', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: START });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('moves forward on each tick and shares one timer', () => {
    const { result } = renderHook(() => useFeedAgeNow());
    renderHook(() => useFeedAgeNow());

    act(() => {
      jest.advanceTimersByTime(FEED_AGE_TICK_MS);
    });

    expect(result.current).toBe(START + FEED_AGE_TICK_MS);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('holds a pinned instant', () => {
    const { result } = renderHook(() => useFeedAgeNow(START - 5_000));

    act(() => {
      jest.advanceTimersByTime(FEED_AGE_TICK_MS);
    });

    expect(result.current).toBe(START - 5_000);
  });

  it('does not listen while its page is not the selected tab', () => {
    const { result } = renderHook(() => useFeedAgeNow(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <SocialFeedPageActiveContext.Provider value={false}>
          {children}
        </SocialFeedPageActiveContext.Provider>
      ),
    });

    act(() => {
      jest.advanceTimersByTime(FEED_AGE_TICK_MS);
    });

    expect(result.current).toBe(START);
    expect(jest.getTimerCount()).toBe(0);
  });
});
