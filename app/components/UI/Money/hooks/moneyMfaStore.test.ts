import { moneyMfaStore } from './moneyMfaStore';

describe('moneyMfaStore', () => {
  afterEach(() => {
    moneyMfaStore.reset();
  });

  it('starts idle with 2-step verification not turned off', () => {
    const state = moneyMfaStore.getState();

    expect(state).toEqual({ phase: 'idle', isTurnedOff: false });
  });

  it('merges a patch into the current state', () => {
    moneyMfaStore.setState({ isTurnedOff: true });

    moneyMfaStore.setState({ phase: 'setting_up' });

    expect(moneyMfaStore.getState()).toEqual({
      phase: 'setting_up',
      isTurnedOff: true,
    });
  });

  it('notifies subscribers when the state changes', () => {
    const listener = jest.fn();
    moneyMfaStore.subscribe(listener);

    moneyMfaStore.setState({ phase: 'failed' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const listener = jest.fn();
    const unsubscribe = moneyMfaStore.subscribe(listener);

    unsubscribe();
    moneyMfaStore.setState({ phase: 'failed' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('restores the initial state and notifies subscribers on reset', () => {
    moneyMfaStore.setState({ phase: 'failed', isTurnedOff: true });
    const listener = jest.fn();
    moneyMfaStore.subscribe(listener);

    moneyMfaStore.reset();

    expect(moneyMfaStore.getState()).toEqual({
      phase: 'idle',
      isTurnedOff: false,
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
