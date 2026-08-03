import { createLiveActivity } from 'expo-widgets';
import { createMetaMaskLiveActivity } from './createMetaMaskLiveActivity.ios';

describe('createMetaMaskLiveActivity (ios)', () => {
  it('delegates to expo-widgets createLiveActivity with the given name and component', () => {
    const liveActivity = jest.fn();

    createMetaMaskLiveActivity('TestActivity', liveActivity);

    expect(createLiveActivity).toHaveBeenCalledWith(
      'TestActivity',
      liveActivity,
    );
  });

  it('returns a factory whose start() produces an instance exposing update/end', async () => {
    const factory = createMetaMaskLiveActivity('TestActivity', jest.fn());

    const instance = factory.start({ foo: 'bar' });
    await instance.update({ foo: 'baz' });
    await instance.end();

    expect(instance.update).toHaveBeenCalledWith({ foo: 'baz' });
    expect(instance.end).toHaveBeenCalled();
  });
});
