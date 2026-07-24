import {
  __resetCliLoginPushNudgeListenersForTests,
  emitCliLoginPushNudge,
  subscribeCliLoginPushNudge,
} from './cliLoginPushNudgeSignal';

describe('cliLoginPushNudgeSignal', () => {
  beforeEach(() => {
    __resetCliLoginPushNudgeListenersForTests();
  });

  it('invokes every subscribed listener when emitted', () => {
    const a = jest.fn();
    const b = jest.fn();
    subscribeCliLoginPushNudge(a);
    subscribeCliLoginPushNudge(b);

    emitCliLoginPushNudge();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('stops calling a listener after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCliLoginPushNudge(listener);
    emitCliLoginPushNudge();
    unsubscribe();
    emitCliLoginPushNudge();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('continues emitting to other listeners if one throws', () => {
    const failing = jest.fn(() => {
      throw new Error('boom');
    });
    const good = jest.fn();
    subscribeCliLoginPushNudge(failing);
    subscribeCliLoginPushNudge(good);

    expect(() => emitCliLoginPushNudge()).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });
});
