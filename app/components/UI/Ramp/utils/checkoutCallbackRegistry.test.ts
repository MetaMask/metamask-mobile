import {
  registerCheckoutCallback,
  getCheckoutCallback,
  removeCheckoutCallback,
} from './checkoutCallbackRegistry';

describe('checkoutCallbackRegistry', () => {
  afterEach(() => {
    // Clean up any registered callbacks between tests
    // Register and remove to avoid leaking state between test files
  });

  it('registers a callback and retrieves it by key', () => {
    const callback = jest.fn();
    const key = registerCheckoutCallback(callback);

    expect(getCheckoutCallback(key)).toBe(callback);

    removeCheckoutCallback(key);
  });

  it('returns undefined for an unregistered key', () => {
    expect(getCheckoutCallback('nonexistent-key')).toBeUndefined();
  });

  it('removes a callback so it is no longer retrievable', () => {
    const callback = jest.fn();
    const key = registerCheckoutCallback(callback);

    removeCheckoutCallback(key);

    expect(getCheckoutCallback(key)).toBeUndefined();
  });

  it('generates unique keys for each registration', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    const key1 = registerCheckoutCallback(cb1);
    const key2 = registerCheckoutCallback(cb2);

    expect(key1).not.toBe(key2);
    expect(getCheckoutCallback(key1)).toBe(cb1);
    expect(getCheckoutCallback(key2)).toBe(cb2);

    removeCheckoutCallback(key1);
    removeCheckoutCallback(key2);
  });

  it('removes only the targeted callback, leaving others intact', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    const key1 = registerCheckoutCallback(cb1);
    const key2 = registerCheckoutCallback(cb2);

    removeCheckoutCallback(key1);

    expect(getCheckoutCallback(key1)).toBeUndefined();
    expect(getCheckoutCallback(key2)).toBe(cb2);

    removeCheckoutCallback(key2);
  });

  it('handles removing a key that does not exist without throwing', () => {
    expect(() => removeCheckoutCallback('does-not-exist')).not.toThrow();
  });
});
