import { renderHook } from '@testing-library/react-native';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { useMoneyHomePerformance } from './useMoneyHomePerformance';

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

const segments = (balanceReady: boolean, activityReady: boolean) => [
  { name: BALANCE, ready: balanceReady },
  { name: ACTIVITY, ready: activityReady },
];

describe('useMoneyHomePerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts one span per segment on mount, none ended yet', () => {
    renderHook(() =>
      useMoneyHomePerformance({
        segments: segments(false, false),
        isEmpty: false,
      }),
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
      ({ b, a }) =>
        useMoneyHomePerformance({ segments: segments(b, a), isEmpty: false }),
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

  it('reports content_state empty when the account has nothing to show', () => {
    renderHook(() =>
      useMoneyHomePerformance({
        segments: segments(true, true),
        isEmpty: true,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: BALANCE,
        data: expect.objectContaining({ content_state: 'empty' }),
      }),
    );
  });

  it('ends each segment only once across re-renders', () => {
    const { rerender } = renderHook(
      ({ b, a }) =>
        useMoneyHomePerformance({ segments: segments(b, a), isEmpty: false }),
      { initialProps: { b: true, a: true } },
    );

    rerender({ b: true, a: true });
    rerender({ b: true, a: true });

    expect(mockEndTrace).toHaveBeenCalledTimes(2);
  });

  it('ends in-flight segments as failures on unmount', () => {
    const { unmount } = renderHook(() =>
      useMoneyHomePerformance({
        segments: segments(true, false),
        isEmpty: false,
      }),
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
