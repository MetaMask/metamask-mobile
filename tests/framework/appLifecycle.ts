/**
 * Hooks that let a fixture react to app process lifecycle events driven by a
 * spec, without the gesture layer needing to know who is listening.
 *
 * The performance profiling fixture uses this to collect the in-flight Hermes
 * CPU profile before a spec kills the app: a profiling session cannot outlive
 * the process that opened it, so the trace has to be written while that process
 * is still alive.
 */

import { createLogger } from './logger.ts';

const logger = createLogger({ name: 'AppLifecycle' });

type BeforeAppTerminateHook = () => Promise<void>;

const beforeAppTerminateHooks = new Set<BeforeAppTerminateHook>();

/**
 * Registers a hook to run immediately before the app process is terminated.
 * Returns a function that removes it again.
 */
export function onBeforeAppTerminate(hook: BeforeAppTerminateHook): () => void {
  beforeAppTerminateHooks.add(hook);
  return () => {
    beforeAppTerminateHooks.delete(hook);
  };
}

/**
 * Runs the registered before-terminate hooks. Hook failures are logged and
 * swallowed so a spec's app restart is never blocked by a listener.
 */
export async function runBeforeAppTerminateHooks(): Promise<void> {
  for (const hook of beforeAppTerminateHooks) {
    try {
      await hook();
    } catch (error) {
      logger.warn(`before-app-terminate hook failed: ${String(error)}`);
    }
  }
}
