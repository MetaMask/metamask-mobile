import { SocialLiveMotionGate } from './SocialLiveMotionGate';

describe('SocialLiveMotionGate', () => {
  it('holds the ids it was set to', () => {
    const gate = new SocialLiveMotionGate();

    gate.set(['a', 'b']);

    expect(gate.has('a')).toBe(true);
    expect(gate.has('c')).toBe(false);
  });

  it('notifies listeners only when the set changes', () => {
    const gate = new SocialLiveMotionGate();
    const listener = jest.fn();
    gate.subscribe(listener);

    gate.set(['a']);
    gate.set(['a']);
    gate.clear();
    gate.clear();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(gate.has('a')).toBe(false);
  });

  it('stops notifying after unsubscribe', () => {
    const gate = new SocialLiveMotionGate();
    const listener = jest.fn();
    const unsubscribe = gate.subscribe(listener);

    unsubscribe();
    gate.set(['a']);

    expect(listener).not.toHaveBeenCalled();
  });
});
