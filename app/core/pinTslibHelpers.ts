type Accessor = (this: unknown, value?: unknown) => unknown;
type State = WeakMap<object, unknown> | WeakSet<object> | Accessor;
type Kind = 'a' | 'f' | 'm' | undefined;
// A static member's descriptor ({ value }), or a getter, setter or method.
type Member = { value: unknown } | Accessor | undefined;

const isOwnedBy = (receiver: unknown, state: State, member: Member) =>
  typeof state === 'function'
    ? receiver === state && Boolean(member)
    : state.has(receiver as object);

// tslib 2's private-field helpers. They also accept tslib 1's argument
// shapes: (receiver, privateMap) and (receiver, privateMap, value).
function __classPrivateFieldGet(
  receiver: unknown,
  state: State,
  kind?: Kind,
  member?: Member,
) {
  if (kind === 'a' && !member) {
    throw new TypeError('Private accessor was defined without a getter');
  }
  if (!isOwnedBy(receiver, state, member)) {
    throw new TypeError(
      'Cannot read private member from an object whose class did not declare it',
    );
  }
  if (kind === 'm') {
    return member;
  }
  if (kind === 'a') {
    return (member as Accessor).call(receiver);
  }
  return member
    ? (member as { value: unknown }).value
    : (state as WeakMap<object, unknown>).get(receiver as object);
}

function __classPrivateFieldSet(
  receiver: unknown,
  state: State,
  value: unknown,
  kind?: Kind,
  member?: Member,
) {
  if (kind === 'm') {
    throw new TypeError('Private method is not writable');
  }
  if (kind === 'a' && !member) {
    throw new TypeError('Private accessor was defined without a setter');
  }
  if (!isOwnedBy(receiver, state, member)) {
    throw new TypeError(
      'Cannot write private member to an object whose class did not declare it',
    );
  }
  if (kind === 'a') {
    (member as Accessor).call(receiver, value);
  } else if (member) {
    (member as { value: unknown }).value = value;
  } else {
    (state as WeakMap<object, unknown>).set(receiver as object, value);
  }
  return value;
}

function __classPrivateFieldIn(state: State, receiver: unknown) {
  if (
    receiver === null ||
    (typeof receiver !== 'object' && typeof receiver !== 'function')
  ) {
    throw new TypeError("Cannot use 'in' operator on non-object");
  }
  return typeof state === 'function'
    ? receiver === state
    : state.has(receiver as object);
}

const HELPERS = {
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
};

/**
 * Pins tslib 2's private-field helpers on the global object.
 *
 * TypeScript-compiled ES modules (e.g. `@metamask/mfa-wallet-network`) take
 * `this.__classPrivateFieldGet` when it exists. tslib 1, loaded by
 * WalletConnect and older Sentry packages, writes its helpers onto the global
 * object, and its two-argument version breaks private methods ("undefined is
 * not a function"). Writes to these globals are ignored.
 *
 * @param target - The global object.
 */
export function pinTslibHelpers(
  target: Record<string, unknown> = globalThis as unknown as Record<
    string,
    unknown
  >,
): void {
  for (const [name, helper] of Object.entries(HELPERS)) {
    Object.defineProperty(target, name, {
      configurable: true,
      get: () => helper,
      set: () => undefined,
    });
  }
}
