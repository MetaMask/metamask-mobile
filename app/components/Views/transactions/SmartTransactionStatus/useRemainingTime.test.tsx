import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { Hex } from '@metamask/utils';
import useRemainingTime, {
  FALLBACK_STX_ESTIMATED_DEADLINE_SEC,
  FALLBACK_STX_MAX_DEADLINE_SEC,
} from './useRemainingTime';

// Mock the selector to return undefined (use fallbacks)
jest.mock('../../../../selectors/smartTransactionsController', () => ({
  getSmartTransactionsFeatureFlagsForChain: jest.fn(() => undefined),
}));

const MOCK_CHAIN_ID = '0x1' as Hex;

const createWrapper = () => {
  const mockStore = configureStore([]);
  const store = mockStore({});

  return ({ children }: { children: React.ReactNode }) => (
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
          chainId: MOCK_CHAIN_ID,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.timeLeftForPendingStxInSec).toBe(
      FALLBACK_STX_ESTIMATED_DEADLINE_SEC,
    );
    expect(result.current.stxDeadlineSec).toBe(
      FALLBACK_STX_ESTIMATED_DEADLINE_SEC,
    );
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
          chainId: MOCK_CHAIN_ID,
        }),
      { wrapper: createWrapper() },
    );

    // Should show 35 seconds remaining (45 - 10)
    expect(result.current.timeLeftForPendingStxInSec).toBe(35);
  });

  it('does not create multiple intervals (regression test for the bug we fixed)', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const { rerender } = renderHook(
      (props: { isStxPending: boolean }) =>
        useRemainingTime({
          creationTime: Date.now() - 5000,
          isStxPending: props.isStxPending,
          chainId: MOCK_CHAIN_ID,
        }),
      {
        // @ts-expect-error - TypeScript limitation with renderHook wrapper types
        wrapper: createWrapper(),
        initialProps: { isStxPending: true },
      },
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
          chainId: MOCK_CHAIN_ID,
        }),
      { wrapper: createWrapper() },
    );

    // Should start at 40 seconds (45 - 5)
    expect(result.current.timeLeftForPendingStxInSec).toBe(40);

    // Advance timer by 3 seconds
    jest.advanceTimersByTime(3000);

    // Should now be 37 seconds (40 - 3)
    expect(result.current.timeLeftForPendingStxInSec).toBe(37);
  });

  it('switches to max deadline when past estimated deadline', () => {
    const now = Date.now();
    const creationTime =
      now - (FALLBACK_STX_ESTIMATED_DEADLINE_SEC * 1000 + 5000); // 50 seconds ago (past 45s estimated)

    const { result } = renderHook(
      () =>
        useRemainingTime({
          creationTime,
          isStxPending: true,
          chainId: MOCK_CHAIN_ID,
        }),
      { wrapper: createWrapper() },
    );

    // Should be past estimated deadline
    expect(result.current.isStxPastEstimatedDeadline).toBe(true);
    expect(result.current.stxDeadlineSec).toBe(FALLBACK_STX_MAX_DEADLINE_SEC);

    // Should show remaining time based on max deadline (150 - 50 = 100 seconds)
    // Note: The hook calculates this as currentDeadline - secondsAfterStxSubmission
    // When past estimated deadline, currentDeadline = 150, secondsAfterStxSubmission = 50
    expect(result.current.timeLeftForPendingStxInSec).toBe(100);
  });

  it('transitions from estimated to max deadline during countdown', () => {
    const now = Date.now();
    const creationTime = now - 40000; // 40 seconds ago (still within 45s estimated)

    const { result } = renderHook(
      () =>
        useRemainingTime({
          creationTime,
          isStxPending: true,
          chainId: MOCK_CHAIN_ID,
        }),
      { wrapper: createWrapper() },
    );

    // Should start with estimated deadline
    expect(result.current.isStxPastEstimatedDeadline).toBe(false);
    expect(result.current.stxDeadlineSec).toBe(
      FALLBACK_STX_ESTIMATED_DEADLINE_SEC,
    );
    expect(result.current.timeLeftForPendingStxInSec).toBe(5); // 45 - 40

    // Advance past the estimated deadline (45 seconds)
    jest.advanceTimersByTime(6000); // 6 more seconds = 46 total

    // Should now be past estimated deadline and using max deadline
    expect(result.current.isStxPastEstimatedDeadline).toBe(true);
    expect(result.current.stxDeadlineSec).toBe(FALLBACK_STX_MAX_DEADLINE_SEC);
    expect(result.current.timeLeftForPendingStxInSec).toBe(104); // 150 - 46
  });

  it('stops countdown when past max deadline', () => {
    const now = Date.now();
    const creationTime = now - FALLBACK_STX_MAX_DEADLINE_SEC * 1000; // Exactly 150 seconds ago

    const { result } = renderHook(
      () =>
        useRemainingTime({
          creationTime,
          isStxPending: true,
          chainId: MOCK_CHAIN_ID,
        }),
      { wrapper: createWrapper() },
    );

    // Should show 0 remaining time at the boundary
    expect(result.current.timeLeftForPendingStxInSec).toBe(0);
    expect(result.current.isStxPastEstimatedDeadline).toBe(true);
  });
});
