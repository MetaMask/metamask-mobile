import { pinTslibHelpers } from './pinTslibHelpers';

type Get = (
  receiver: object,
  state: WeakMap<object, unknown> | WeakSet<object>,
  kind?: 'f' | 'm',
  f?: unknown,
) => unknown;
type Set = (
  receiver: object,
  state: WeakMap<object, unknown>,
  value: unknown,
) => unknown;

// tslib 1's helper, as written onto the global object by its UMD build.
const tslib1ClassPrivateFieldGet = (
  receiver: object,
  privateMap: WeakMap<object, unknown>,
) => privateMap.get(receiver);

const pinned = () => {
  const target: Record<string, unknown> = {};
  pinTslibHelpers(target);
  return target;
};

describe('pinTslibHelpers', () => {
  it('ignores tslib 1 overwriting the globals', () => {
    const target = pinned();
    const helper = target.__classPrivateFieldGet;

    target.__classPrivateFieldGet = tslib1ClassPrivateFieldGet;

    expect(target.__classPrivateFieldGet).toBe(helper);
  });

  it('reads private methods', () => {
    const get = pinned().__classPrivateFieldGet as Get;
    const receiver = {};
    const instances = new WeakSet([receiver]);
    const method = () => 'called';

    expect(get(receiver, instances, 'm', method)).toBe(method);
  });

  it('reads and writes private fields with tslib 1 call shapes', () => {
    const target = pinned();
    const get = target.__classPrivateFieldGet as Get;
    const set = target.__classPrivateFieldSet as Set;
    const receiver = {};
    const fields = new WeakMap<object, unknown>([[receiver, 'before']]);

    set(receiver, fields, 'after');

    expect(get(receiver, fields)).toBe('after');
  });

  it('rejects objects whose class did not declare the member', () => {
    const get = pinned().__classPrivateFieldGet as Get;

    expect(() => get({}, new WeakMap())).toThrow(
      'Cannot read private member from an object whose class did not declare it',
    );
  });

  it('checks membership for the in operator', () => {
    const classPrivateFieldIn = pinned().__classPrivateFieldIn as (
      state: WeakSet<object>,
      receiver: unknown,
    ) => boolean;
    const receiver = {};

    expect(classPrivateFieldIn(new WeakSet([receiver]), receiver)).toBe(true);
    expect(() => classPrivateFieldIn(new WeakSet(), 1)).toThrow(TypeError);
  });
});
