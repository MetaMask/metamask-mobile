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
  return {
    async acquire(timeoutMs: number) {
      const acquire = nativeModule()?.acquireRefreshLock;
      // The Wallet extensions ship in the same binary as this module. Without
      // it there is no other process to coordinate with.
      if (!acquire) return true;
      return acquire(timeoutMs);
    },
    async release() {
      await nativeModule()?.releaseRefreshLock?.();
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
