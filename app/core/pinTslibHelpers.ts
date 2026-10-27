import {
  __classPrivateFieldGet,
  __classPrivateFieldIn,
  __classPrivateFieldSet,
} from 'tslib';

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
 * not a function"). tslib 2's helpers also accept tslib 1's call shapes.
 * Writes to these globals are ignored, and the pin can't be redefined.
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
    // Already pinned (e.g. the module ran again after a Fast Refresh).
    if (Object.getOwnPropertyDescriptor(target, name)?.configurable === false) {
      continue;
    }
    Object.defineProperty(target, name, {
      configurable: false,
      get: () => helper,
      set: () => undefined,
    });
  }
}
