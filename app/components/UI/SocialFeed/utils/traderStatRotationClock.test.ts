import { subscribeToTraderStatRotation } from './traderStatRotationClock';

const INTERVAL_MS = 5000;

describe('subscribeToTraderStatRotation', () => {
  let unsubscribers: (() => void)[];

  const subscribe = (onRotate: () => void) => {
    const unsubscribe = subscribeToTraderStatRotation(INTERVAL_MS, onRotate);
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    unsubscribers = [];
  });

  afterEach(() => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    jest.useRealTimers();
  });

  it('rotates every listener on the same tick', () => {
    const first = jest.fn();
    const second = jest.fn();
    subscribe(first);
    jest.advanceTimersByTime(1000);
    subscribe(second);

    jest.advanceTimersByTime(INTERVAL_MS - 1000);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('holds a listener that joined less than half an interval before a tick', () => {
    const early = jest.fn();
    const late = jest.fn();
    subscribe(early);
    jest.advanceTimersByTime(INTERVAL_MS - 1000);
    subscribe(late);

    jest.advanceTimersByTime(1000);
    const lateRotationsOnFirstTick = late.mock.calls.length;
    jest.advanceTimersByTime(INTERVAL_MS);

    expect(early).toHaveBeenCalledTimes(2);
    expect(lateRotationsOnFirstTick).toBe(0);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('stops rotating a listener once it leaves', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    unsubscribe();
    jest.advanceTimersByTime(INTERVAL_MS);

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops its timer once the last listener leaves', () => {
    const unsubscribeFirst = subscribe(jest.fn());
    const unsubscribeSecond = subscribe(jest.fn());

    unsubscribeFirst();
    const timersWhileSubscribed = jest.getTimerCount();
    unsubscribeSecond();

    expect(timersWhileSubscribed).toBe(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
