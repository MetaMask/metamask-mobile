import { renderHook } from '@testing-library/react-native';
import { TraceName, TraceOperation } from '../../../../util/trace';
import {
  useMoneyHomePerformance,
  type MoneyHomeSegment,
} from './useMoneyHomePerformance';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    MoneyHomeTimeToContent: 'Money Home Time To Content',
    MoneyHomeBalanceTimeToContent: 'Money Home Balance Time To Content',
    MoneyHomeActivityTimeToContent: 'Money Home Activity Time To Content',
  },
  TraceOperation: {
    MoneyHomePerformance: 'money.home.performance',
  },
}));

const { trace: mockTrace, endTrace: mockEndTrace } = jest.requireMock(
  '../../../../util/trace',
);

const BALANCE = TraceName.MoneyHomeBalanceTimeToContent;
const ACTIVITY = TraceName.MoneyHomeActivityTimeToContent;

const segments = (
  balanceReady: boolean,
  activityReady: boolean,
  overrides: Partial<
    Record<'balance' | 'activity', Partial<MoneyHomeSegment>>
  > = {},
): MoneyHomeSegment[] => [
  {
    name: BALANCE,
    ready: balanceReady,
    contentState: 'filled',
    ...overrides.balance,
  },
  {
    name: ACTIVITY,
    ready: activityReady,
    contentState: 'filled',
    ...overrides.activity,
  },
];

describe('useMoneyHomePerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts one span per segment on mount, none ended yet', () => {
    renderHook(() =>
      useMoneyHomePerformance({ segments: segments(false, false) }),
    );

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: BALANCE,
        op: TraceOperation.MoneyHomePerformance,
      }),
    );
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ACTIVITY,
        op: TraceOperation.MoneyHomePerformance,
      }),
    );
    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('ends each segment independently as its ready flag flips', () => {
    const { rerender } = renderHook(
      ({ b, a }) => useMoneyHomePerformance({ segments: segments(b, a) }),
      { initialProps: { b: false, a: false } },
    );

    // Balance resolves first.
    rerender({ b: true, a: false });
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: BALANCE,
        data: expect.objectContaining({
          success: true,
          content_state: 'filled',
        }),
      }),
    );

    // Activity resolves later — only the activity span ends now.
    rerender({ b: true, a: true });
    expect(mockEndTrace).toHaveBeenCalledTimes(2);
    expect(mockEndTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: ACTIVITY,
        data: expect.objectContaining({ success: true }),
      }),
    );
  });

  it('reports each segment’s own content_state at its end time', () => {
    renderHook(() =>
      useMoneyHomePerformance({
        segments: segments(true, true, {
          balance: { contentState: 'empty' },
        }),
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: BALANCE,
        data: expect.objectContaining({ content_state: 'empty' }),
      }),
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ACTIVITY,
        data: expect.objectContaining({ content_state: 'filled' }),
      }),
    );
  });

  it('ends a segment as a failure when it fails before becoming ready', () => {
    const { rerender } = renderHook(
      ({ ready, failed }) =>
        useMoneyHomePerformance({
          segments: segments(false, ready, { activity: { failed } }),
        }),
      { initialProps: { ready: false, failed: true } },
    );

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ACTIVITY,
        data: expect.objectContaining({ success: false, reason: 'error' }),
      }),
    );

    // A later ready flip must not re-end (or relabel) the failed span.
    rerender({ ready: true, failed: false });
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('marks failure even when ready flips true in the same render', () => {
    // An error can flip the "settling" state off, making the segment look
    // ready — failure must win so the error is not recorded as a fast render.
    renderHook(() =>
      useMoneyHomePerformance({
        segments: segments(true, true, { activity: { failed: true } }),
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ACTIVITY,
        data: expect.objectContaining({ success: false, reason: 'error' }),
      }),
    );
  });

  it('does not relabel a successfully-ended segment when a later error arrives', () => {
    const { rerender } = renderHook(
      ({ failed }) =>
        useMoneyHomePerformance({
          segments: segments(true, true, { activity: { failed } }),
        }),
      { initialProps: { failed: false } },
    );

    expect(mockEndTrace).toHaveBeenCalledTimes(2);
    mockEndTrace.mockClear();

    rerender({ failed: true });
    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('ends each segment only once across re-renders', () => {
    const { rerender } = renderHook(
      ({ b, a }) => useMoneyHomePerformance({ segments: segments(b, a) }),
      { initialProps: { b: true, a: true } },
    );

    rerender({ b: true, a: true });
    rerender({ b: true, a: true });

    expect(mockEndTrace).toHaveBeenCalledTimes(2);
  });

  it('ends in-flight segments as failures on unmount', () => {
    const { unmount } = renderHook(() =>
      useMoneyHomePerformance({ segments: segments(true, false) }),
    );

    // Balance ended successfully on mount-render; activity is still in flight.
    mockEndTrace.mockClear();
    unmount();

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ACTIVITY,
        data: expect.objectContaining({ success: false, reason: 'unmounted' }),
      }),
    );
  });
});
