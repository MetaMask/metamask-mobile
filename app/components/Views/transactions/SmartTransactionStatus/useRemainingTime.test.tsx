import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import useRemainingTime, {
  FALLBACK_STX_ESTIMATED_DEADLINE_SEC,
} from './useRemainingTime';

// Mock the selector to return undefined (use fallbacks)
jest.mock('../../../../reducers/swaps', () => ({
  selectSwapsChainFeatureFlags: jest.fn(() => undefined),
}));

// Create a wrapper for tests
const createWrapper = () => {
  const mockStore = configureStore([]);
  const store = mockStore({});
  
  return ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useRemainingTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('initializes with fallback deadline when not pending', () => {
    const { result } = renderHook(
      () =>
        useRemainingTime({
          creationTime: Date.now(),
          isStxPending: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.timeLeftForPendingStxInSec).toBe(FALLBACK_STX_ESTIMATED_DEADLINE_SEC);
    expect(result.current.stxDeadlineSec).toBe(FALLBACK_STX_ESTIMATED_DEADLINE_SEC);
    expect(result.current.isStxPastEstimatedDeadline).toBe(false);
  });

  it('calculates remaining time when pending', () => {
    const now = Date.now();
    const creationTime = now - 10000; // 10 seconds ago

    const { result } = renderHook(
      () =>
        useRemainingTime({
          creationTime,
          isStxPending: true,
        }),
      { wrapper: createWrapper() }
    );

    // Should show 35 seconds remaining (45 - 10)
    expect(result.current.timeLeftForPendingStxInSec).toBe(35);
  });

  it('does not create multiple intervals (regression test for the bug we fixed)', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    
    const { result, rerender } = renderHook(
      (props: { isStxPending: boolean }) =>
        useRemainingTime({
          creationTime: Date.now() - 5000,
          isStxPending: props.isStxPending,
        }),
      {
        wrapper: createWrapper() as any,
        initialProps: { isStxPending: true }
      }
    );

    // Initial render should create one interval
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    // Force a re-render - this should NOT create a new interval
    rerender({ isStxPending: true });
    
    // Still should only be one interval
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('counts down over time when pending', () => {
    const now = Date.now();
    const creationTime = now - 5000; // 5 seconds ago
  
    const { result } = renderHook(
      () =>
        useRemainingTime({
          creationTime,
          isStxPending: true,
        }),
      { wrapper: createWrapper() }
    );
  
    // Should start at 40 seconds (45 - 5)
    expect(result.current.timeLeftForPendingStxInSec).toBe(40);
  
    // Advance timer by 3 seconds
    jest.advanceTimersByTime(3000);
  
    // Should now be 37 seconds (40 - 3)
    expect(result.current.timeLeftForPendingStxInSec).toBe(37);
  });
});