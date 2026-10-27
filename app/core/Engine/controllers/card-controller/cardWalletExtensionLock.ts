import { NativeModules } from 'react-native';

export interface CardRefreshLock {
  acquire: (timeoutMs: number) => Promise<boolean>;
  release: () => Promise<void>;
}

interface CardWalletExtensionNativeModule {
  writeSnapshot?: (json: string) => Promise<void>;
  clearSnapshot?: () => Promise<void>;
  acquireRefreshLock?: (timeoutMs: number) => Promise<boolean>;
  releaseRefreshLock?: () => Promise<void>;
}

export const CARD_REFRESH_LOCK_TIMEOUT_MS = 10_000;

function nativeModule(): CardWalletExtensionNativeModule | undefined {
  return NativeModules.CardWalletExtensionStore as
    | CardWalletExtensionNativeModule
    | undefined;
}

export function createNativeCardRefreshLock(): CardRefreshLock {
  // Native methods share one queue. A second acquire must not enter native
  // code until the holder releases, or the two calls deadlock on that queue.
  let tail: Promise<void> = Promise.resolve();
  let releaseTurn: (() => void) | undefined;

  return {
    async acquire(timeoutMs: number) {
      const previous = tail;
      let resolveTurn: () => void = () => undefined;
      tail = new Promise<void>((resolve) => {
        resolveTurn = resolve;
      });
      await previous;

      const acquire = nativeModule()?.acquireRefreshLock;
      // The Wallet extensions ship in the same binary as this module. Without
      // it there is no other process to coordinate with.
      if (!acquire) {
        releaseTurn = resolveTurn;
        return true;
      }
      try {
        const acquired = await acquire(timeoutMs);
        if (!acquired) {
          resolveTurn();
          return false;
        }
        releaseTurn = resolveTurn;
        return true;
      } catch (error) {
        resolveTurn();
        throw error;
      }
    },
    async release() {
      const finish = releaseTurn;
      releaseTurn = undefined;
      try {
        await nativeModule()?.releaseRefreshLock?.();
      } finally {
        finish?.();
      }
    },
  };
}

export async function writeCardWalletExtensionSnapshot(
  json: string,
): Promise<void> {
  await nativeModule()?.writeSnapshot?.(json);
}

export async function clearCardWalletExtensionSnapshot(): Promise<void> {
  await nativeModule()?.clearSnapshot?.();
}
