import { SocialLivePriceStore } from './SocialLivePriceStore';

const KEY = 'perp:BTC' as const;

describe('SocialLivePriceStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits the first price immediately', () => {
    const store = new SocialLivePriceStore(1000);
    const listener = jest.fn();
    store.subscribe(KEY, listener);

    store.publish(KEY, 100);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get(KEY)).toStrictEqual({ price: 100 });
  });

  it('throttles to one emit per window and keeps the newest price', () => {
    const store = new SocialLivePriceStore(1000);
    const listener = jest.fn();
    store.subscribe(KEY, listener);

    store.publish(KEY, 100);
    store.publish(KEY, 101);
    store.publish(KEY, 99);
    expect(listener).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get(KEY)).toStrictEqual({ price: 99 });
  });

  it('does not notify for an unchanged price', () => {
    const store = new SocialLivePriceStore(0);
    const listener = jest.fn();
    store.subscribe(KEY, listener);

    store.publish(KEY, 100);
    store.publish(KEY, 100);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid prices', () => {
    const store = new SocialLivePriceStore(0);

    store.publish(KEY, Number.NaN);
    store.publish(KEY, 0);
    store.publish(KEY, -1);

    expect(store.get(KEY)).toBeUndefined();
  });

  it('only notifies listeners of the key that ticked', () => {
    const store = new SocialLivePriceStore(0);
    const btc = jest.fn();
    const eth = jest.fn();
    store.subscribe(KEY, btc);
    store.subscribe('perp:ETH', eth);

    store.publish(KEY, 100);

    expect(btc).toHaveBeenCalledTimes(1);
    expect(eth).not.toHaveBeenCalled();
  });

  it('drops a queued emit on cancel but keeps the last price', () => {
    const store = new SocialLivePriceStore(1000);

    store.publish(KEY, 100);
    store.publish(KEY, 110);
    store.cancelPending();
    jest.advanceTimersByTime(1000);

    expect(store.get(KEY)?.price).toBe(100);
  });

  it('stops notifying after unsubscribe', () => {
    const store = new SocialLivePriceStore(0);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(KEY, listener);

    store.publish(KEY, 100);
    unsubscribe();
    store.publish(KEY, 100);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('releases queued price state after the final unsubscribe', () => {
    const store = new SocialLivePriceStore(1000);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(KEY, listener);

    store.publish(KEY, 100);
    store.publish(KEY, 110);
    unsubscribe();
    jest.advanceTimersByTime(1000);

    expect(store.get(KEY)).toBeUndefined();
  });
});
