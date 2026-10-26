import {
  __classPrivateFieldGet,
  __classPrivateFieldIn,
  __classPrivateFieldSet,
} from 'tslib';
import { pinTslibHelpers } from './pinTslibHelpers';

type Get = (
  receiver: object,
  state: WeakMap<object, unknown> | WeakSet<object>,
  kind?: 'm',
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

const TSLIB_HELPERS = {
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
};
const HELPER_NAMES = Object.keys(
  TSLIB_HELPERS,
) as (keyof typeof TSLIB_HELPERS)[];

const pinned = () => {
  const target: Record<string, unknown> = {};
  pinTslibHelpers(target);
  return target;
};

describe('pinTslibHelpers', () => {
  it.each(HELPER_NAMES)('pins tslib 2 %s', (name) => {
    expect(pinned()[name]).toBe(TSLIB_HELPERS[name]);
  });

  it('ignores tslib 1 overwriting the globals', () => {
    const target = pinned();
    const helper = target.__classPrivateFieldGet;

    target.__classPrivateFieldGet = tslib1ClassPrivateFieldGet;

    expect(target.__classPrivateFieldGet).toBe(helper);
  });

  it('cannot be redefined', () => {
    const target = pinned();

    expect(() =>
      Object.defineProperty(target, '__classPrivateFieldGet', {
        value: tslib1ClassPrivateFieldGet,
      }),
    ).toThrow(TypeError);
  });

  it('can run again without throwing', () => {
    const target = pinned();

    expect(() => pinTslibHelpers(target)).not.toThrow();
  });

  it('reads private methods after tslib 1 loads', () => {
    const target = pinned();
    target.__classPrivateFieldGet = tslib1ClassPrivateFieldGet;
    const get = target.__classPrivateFieldGet as Get;
    const receiver = {};
    const method = () => 'called';

    expect(get(receiver, new WeakSet([receiver]), 'm', method)).toBe(method);
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

  it('pins the helpers on the global object by default', () => {
    pinTslibHelpers();
    const globalTarget = globalThis as unknown as Record<string, unknown>;
    const helper = globalTarget.__classPrivateFieldGet;

    globalTarget.__classPrivateFieldGet = () => undefined;

    expect(globalTarget.__classPrivateFieldGet).toBe(helper);
  });
});
