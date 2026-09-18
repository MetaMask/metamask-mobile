import {
  getReduxActionTrace,
  reduxActionTraceMiddleware,
  resetReduxActionTrace,
} from './reduxActionTrace';

const dispatchThrough = (actions: unknown[]) => {
  const next = jest.fn((action) => action);
  const invoke = (
    reduxActionTraceMiddleware as unknown as (
      api: unknown,
    ) => (n: typeof next) => (action: unknown) => unknown
  )({})(next);

  actions.forEach((action) => invoke(action));

  return next;
};

describe('reduxActionTrace', () => {
  beforeEach(() => {
    resetReduxActionTrace();
  });

  it('records dispatched action types in order', () => {
    dispatchThrough([{ type: 'first' }, { type: 'second' }]);

    expect(getReduxActionTrace().recentActionTypes).toStrictEqual([
      'first',
      'second',
    ]);
  });

  it('passes every action to the next middleware untouched', () => {
    const action = { type: 'passthrough', payload: 42 };

    const next = dispatchThrough([action]);

    expect(next).toHaveBeenCalledWith(action);
  });

  it('counts repeated action types so a runaway dispatch stands out', () => {
    dispatchThrough([
      { type: 'noisy' },
      { type: 'noisy' },
      { type: 'noisy' },
      { type: 'quiet' },
    ]);

    const { actionCountsInWindow, actionsInWindow } = getReduxActionTrace();

    expect(actionCountsInWindow).toStrictEqual({ noisy: 3, quiet: 1 });
    expect(actionsInWindow).toBe(4);
  });

  it('orders counts with the busiest action type first', () => {
    dispatchThrough([{ type: 'rare' }, { type: 'common' }, { type: 'common' }]);

    expect(
      Object.keys(getReduxActionTrace().actionCountsInWindow),
    ).toStrictEqual(['common', 'rare']);
  });

  it('caps retained entries so the buffer cannot grow without bound', () => {
    dispatchThrough(
      Array.from({ length: 200 }, (_, index) => ({ type: `action-${index}` })),
    );

    const { recentActionTypes } = getReduxActionTrace();

    expect(recentActionTypes).toHaveLength(60);
    expect(recentActionTypes[recentActionTypes.length - 1]).toBe('action-199');
  });

  it('ignores actions without a string type', () => {
    dispatchThrough([{ type: 123 }, {}, { type: 'valid' }]);

    expect(getReduxActionTrace().recentActionTypes).toStrictEqual(['valid']);
  });

  it('retains no payload data', () => {
    dispatchThrough([{ type: 'withSecret', payload: { address: '0xabc' } }]);

    expect(JSON.stringify(getReduxActionTrace())).not.toContain('0xabc');
  });
});
