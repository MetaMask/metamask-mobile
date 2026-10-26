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

type LooseSet = (
  receiver: unknown,
  state: unknown,
  value: unknown,
  kind?: string,
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

const HELPER_NAMES = [
  '__classPrivateFieldGet',
  '__classPrivateFieldSet',
  '__classPrivateFieldIn',
];

describe('pinTslibHelpers', () => {
  afterEach(() => {
    const globalTarget = globalThis as unknown as Record<string, unknown>;
    for (const name of HELPER_NAMES) {
      delete globalTarget[name];
    }
  });

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

  it('calls private accessors', () => {
    const target = pinned();
    const get = target.__classPrivateFieldGet as (
      receiver: object,
      state: WeakSet<object>,
      kind: 'a',
      accessor: (this: object, value?: unknown) => unknown,
    ) => unknown;
    const set = target.__classPrivateFieldSet as (
      receiver: object,
      state: WeakSet<object>,
      value: unknown,
      kind: 'a',
      accessor: (this: object, value?: unknown) => unknown,
    ) => unknown;
    const receiver = { stored: 'before' };
    const instances = new WeakSet([receiver]);

    set(receiver, instances, 'after', 'a', function (this: object, value) {
      (this as { stored: unknown }).stored = value;
    });

    expect(
      get(receiver, instances, 'a', function (this: object) {
        return (this as { stored: unknown }).stored;
      }),
    ).toBe('after');
  });

  it('reads and writes static private fields', () => {
    const target = pinned();
    const get = target.__classPrivateFieldGet as (
      receiver: unknown,
      state: unknown,
      kind: 'f',
      descriptor: { value: unknown },
    ) => unknown;
    const set = target.__classPrivateFieldSet as (
      receiver: unknown,
      state: unknown,
      value: unknown,
      kind: 'f',
      descriptor: { value: unknown },
    ) => unknown;
    class WithStatic {}
    const descriptor = { value: 'before' };

    set(WithStatic, WithStatic, 'after', 'f', descriptor);

    expect(get(WithStatic, WithStatic, 'f', descriptor)).toBe('after');
  });

  it.each([
    [
      'writing a private method',
      (set: LooseSet) => set({}, new WeakSet(), 1, 'm'),
      'Private method is not writable',
    ],
    [
      'writing an accessor without a setter',
      (set: LooseSet) => set({}, new WeakSet(), 1, 'a'),
      'Private accessor was defined without a setter',
    ],
    [
      'writing to an object whose class did not declare the member',
      (set: LooseSet) => set({}, new WeakMap(), 1),
      'Cannot write private member to an object whose class did not declare it',
    ],
  ])('rejects %s', (_name, write, message) => {
    const set = pinned().__classPrivateFieldSet as LooseSet;

    expect(() => write(set)).toThrow(message);
  });

  it('rejects reading an accessor without a getter', () => {
    const get = pinned().__classPrivateFieldGet as (
      receiver: object,
      state: WeakSet<object>,
      kind: 'a',
    ) => unknown;

    expect(() => get({}, new WeakSet(), 'a')).toThrow(
      'Private accessor was defined without a getter',
    );
  });

  it('checks static membership for the in operator', () => {
    const classPrivateFieldIn = pinned().__classPrivateFieldIn as (
      state: unknown,
      receiver: unknown,
    ) => boolean;
    class WithStatic {}

    expect(classPrivateFieldIn(WithStatic, WithStatic)).toBe(true);
  });

  it('pins the helpers on the global object by default', () => {
    pinTslibHelpers();
    const globalTarget = globalThis as unknown as Record<string, unknown>;
    const helper = globalTarget.__classPrivateFieldGet;

    globalTarget.__classPrivateFieldGet = () => undefined;

    expect(globalTarget.__classPrivateFieldGet).toBe(helper);
  });
});
