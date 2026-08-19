import type {
  LighterSignerBridge,
  LighterWasmCall,
} from '@metamask/perps-controller';

/**
 * Executor wired up by LighterSignerWebView once the WASM page reports ready.
 * Mirrors the queue pattern of the reference Lighter RN SDK (`wasm.ts`): calls
 * made before the WebView is ready await the readiness promise instead of
 * failing, so the bridge can be handed to PerpsController at Engine init —
 * before the React tree (and the hidden WebView) has mounted.
 */
type LighterExecutor = (call: LighterWasmCall) => Promise<unknown>;

/** Upper bound covering both the pre-ready wait and the page round-trip. */
const READY_TIMEOUT_MS = 90_000;

const resetListeners = new Set<() => void>();
let executor: LighterExecutor | null = null;
let readyResolve: () => void;
let readyReject: (reason: Error) => void;
let ready = new Promise<void>((resolve, reject) => {
  readyResolve = resolve;
  readyReject = reject;
});
// Callers race `ready`; without a handler here an early reset would surface
// as an unhandled rejection before any caller attached.
ready.catch(() => undefined);

/**
 * Called by LighterSignerWebView when the WASM page posts `ready`.
 *
 * @param newExecutor - Function that posts an execute message to the WebView.
 */
export function connectLighterExecutor(newExecutor: LighterExecutor): void {
  executor = newExecutor;
  readyResolve();
}

/**
 * Re-arms the readiness promise so new calls queue while the WebView
 * reloads (crash recovery, content/render process loss). Callers already
 * waiting on the OLD readiness promise are rejected — their page-side state
 * is gone and they must retry against the re-initialized signer.
 */
export function resetLighterBridge(): void {
  executor = null;
  readyReject(
    new Error('Lighter signer WebView reloaded; retry the operation'),
  );
  ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  ready.catch(() => undefined);
  // Notify subscribers (PerpsController's LighterProvider) so the cached
  // signer session is invalidated immediately, not on the next failure.
  for (const listener of resetListeners) {
    try {
      listener();
    } catch {
      // Listener errors must not break bridge recovery.
    }
  }
}

/**
 * Singleton bridge handed to PerpsController via the Lighter credentials
 * bag (`providerCredentials.lighter.signerBridge`).
 */
export const lighterSignerBridge: LighterSignerBridge = {
  async execute<Result>(call: LighterWasmCall): Promise<Result> {
    // The timeout covers the readiness wait too: a signer that never mounts
    // must fail callers instead of queueing them forever.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        ready,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `Lighter signer not ready within ${READY_TIMEOUT_MS}ms for ${call.function}`,
                ),
              ),
            READY_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    if (!executor) {
      throw new Error('Lighter signer bridge executor not connected');
    }
    return (await executor(call)) as Result;
  },
  onReset(listener: () => void): () => void {
    resetListeners.add(listener);
    return () => {
      resetListeners.delete(listener);
    };
  },
  reset: resetLighterBridge,
};
