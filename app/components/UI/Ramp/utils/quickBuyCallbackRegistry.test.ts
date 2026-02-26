import {
  clearAllQuickBuyErrorCallbacks,
  getQuickBuyErrorCallback,
  registerQuickBuyErrorCallback,
  removeQuickBuyErrorCallback,
} from './quickBuyCallbackRegistry';

describe('quickBuyCallbackRegistry', () => {
  afterEach(() => {
    clearAllQuickBuyErrorCallbacks();
  });

  it('registers and retrieves callbacks by key', () => {
    const callback = jest.fn();

    const key = registerQuickBuyErrorCallback(callback);

    expect(getQuickBuyErrorCallback(key)).toBe(callback);
  });

  it('removes callbacks by key', () => {
    const callback = jest.fn();
    const key = registerQuickBuyErrorCallback(callback);

    removeQuickBuyErrorCallback(key);

    expect(getQuickBuyErrorCallback(key)).toBeUndefined();
  });

  it('clears all callbacks', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const key1 = registerQuickBuyErrorCallback(callback1);
    const key2 = registerQuickBuyErrorCallback(callback2);

    clearAllQuickBuyErrorCallbacks();

    expect(getQuickBuyErrorCallback(key1)).toBeUndefined();
    expect(getQuickBuyErrorCallback(key2)).toBeUndefined();
  });
});
