import { createDeferredPromise } from '@metamask/utils';

let engineReady = createDeferredPromise();

/**
 * Wait until the Engine has finished constructing all messenger clients.
 *
 * @returns A promise that resolves once {@link resolveEngineReady} is called.
 */
export function waitForEngineReady(): Promise<void> {
  return engineReady.promise;
}

/**
 * Mark the Engine as ready. Called at the end of the Engine constructor.
 */
export function resolveEngineReady(): void {
  engineReady.resolve();
}

/**
 * Reset the ready signal so a new Engine instance waits again.
 * Called when the Engine is destroyed.
 */
export function resetEngineReady(): void {
  engineReady = createDeferredPromise();
}
