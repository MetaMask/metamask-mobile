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

let executor: LighterExecutor | null = null;
let readyResolve: () => void;
let ready = new Promise<void>((resolve) => {
  readyResolve = resolve;
});

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
 * Re-arms the readiness promise so calls queue while the WebView reloads
 * (e.g. after onContentProcessDidTerminate).
 */
export function resetLighterBridge(): void {
  executor = null;
  ready = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });
}

/**
 * Singleton bridge handed to PerpsController via platform dependencies
 * (`lighterSignerBridge` on PerpsPlatformDependencies).
 */
export const lighterSignerBridge: LighterSignerBridge = {
  async execute<Result>(call: LighterWasmCall): Promise<Result> {
    await ready;
    if (!executor) {
      throw new Error('Lighter signer bridge executor not connected');
    }
    return (await executor(call)) as Result;
  },
  reset: resetLighterBridge,
};
