import {
  subscribeToTraderStatRotation,
  type TraderStatRotationListener,
} from './traderStatRotationClock';

const INTERVAL_MS = 5000;
const FADE_MS = 220;

const createListener = (): jest.Mocked<TraderStatRotationListener> => ({
  fadeOut: jest.fn(),
  swap: jest.fn(),
});

describe('subscribeToTraderStatRotation', () => {
  let unsubscribers: (() => void)[];

  const subscribe = (listener: TraderStatRotationListener) => {
    const unsubscribe = subscribeToTraderStatRotation(
      INTERVAL_MS,
      FADE_MS,
      listener,
    );
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

  it('fades every listener out on the same tick and swaps them after the fade', () => {
    const first = createListener();
    const second = createListener();
    subscribe(first);
    jest.advanceTimersByTime(1000);
    subscribe(second);

    jest.advanceTimersByTime(INTERVAL_MS - 1000);
    const swapsDuringFade = first.swap.mock.calls.length;
    jest.advanceTimersByTime(FADE_MS);

    expect(first.fadeOut).toHaveBeenCalledTimes(1);
    expect(second.fadeOut).toHaveBeenCalledTimes(1);
    expect(swapsDuringFade).toBe(0);
    expect(first.swap).toHaveBeenCalledTimes(1);
    expect(second.swap).toHaveBeenCalledTimes(1);
  });

  it('holds a listener that joined less than half an interval before a tick', () => {
    const early = createListener();
    const late = createListener();
    subscribe(early);
    jest.advanceTimersByTime(INTERVAL_MS - 1000);
    subscribe(late);

    jest.advanceTimersByTime(1000 + FADE_MS);
    const earlySwapsOnFirstTick = early.swap.mock.calls.length;
    const lateFadesOnFirstTick = late.fadeOut.mock.calls.length;
    jest.advanceTimersByTime(INTERVAL_MS);

    expect(earlySwapsOnFirstTick).toBe(1);
    expect(lateFadesOnFirstTick).toBe(0);
    expect(late.swap).toHaveBeenCalledTimes(1);
  });

  it('skips the swap for a listener that leaves during the fade', () => {
    const listener = createListener();
    const unsubscribe = subscribe(listener);

    jest.advanceTimersByTime(INTERVAL_MS);
    unsubscribe();
    jest.advanceTimersByTime(FADE_MS);

    expect(listener.fadeOut).toHaveBeenCalledTimes(1);
    expect(listener.swap).not.toHaveBeenCalled();
  });

  it('stops its timers once the last listener leaves', () => {
    const unsubscribeFirst = subscribe(createListener());
    const unsubscribeSecond = subscribe(createListener());

    unsubscribeFirst();
    const timersWhileSubscribed = jest.getTimerCount();
    unsubscribeSecond();

    expect(timersWhileSubscribed).toBe(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
