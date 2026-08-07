import { createMetaMaskLiveActivity } from './createMetaMaskLiveActivity';

describe('createMetaMaskLiveActivity (non-iOS fallback)', () => {
  it('returns a no-op factory whose start() never throws', async () => {
    const factory = createMetaMaskLiveActivity('TestActivity', jest.fn());

    expect(factory.getInstances()).toEqual([]);

    const instance = factory.start({ foo: 'bar' });
    await expect(instance.update({ foo: 'baz' })).resolves.toBeUndefined();
    await expect(instance.end()).resolves.toBeUndefined();
    await expect(instance.getPushToken()).resolves.toBeNull();
    expect(() =>
      instance.addPushTokenListener(jest.fn()).remove(),
    ).not.toThrow();
  });
});
