import { AppState, type AppStateStatus } from 'react-native';
import {
  VBA_CUF_LIFECYCLE_CONTEXT,
  type VbaCufLifecycleContext,
} from './vbaCufTags';

let currentContext: VbaCufLifecycleContext =
  VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS;
let hasEnteredForegroundOnce = false;
let hasBackgroundedSinceLastActive = false;
let subscription: { remove: () => void } | undefined;

/** Updates the shared lifecycle context while preserving iOS background state. */
export const handleVbaCufAppStateChange = (nextState: AppStateStatus): void => {
  if (nextState === 'background') {
    hasBackgroundedSinceLastActive = true;
    return;
  }

  if (nextState !== 'active') {
    return;
  }

  if (hasEnteredForegroundOnce && hasBackgroundedSinceLastActive) {
    currentContext = VBA_CUF_LIFECYCLE_CONTEXT.BACKGROUND_RESUME;
  }
  hasEnteredForegroundOnce = true;
  hasBackgroundedSinceLastActive = false;
};

const initializeLifecycleTracking = (): void => {
  if (subscription) {
    return;
  }

  hasEnteredForegroundOnce = AppState.currentState === 'active';
  hasBackgroundedSinceLastActive = AppState.currentState === 'background';
  subscription = AppState.addEventListener(
    'change',
    handleVbaCufAppStateChange,
  );
};

/** Returns the current VBA lifecycle context and initializes tracking lazily. */
export const getVbaCufLifecycleContext = (): VbaCufLifecycleContext => {
  initializeLifecycleTracking();
  return currentContext;
};

/** Marks subsequent foreground work as warm after a journey settles. */
export const settleVbaCufLifecycleContext = (): void => {
  currentContext = VBA_CUF_LIFECYCLE_CONTEXT.WARM;
};

/** Resets lifecycle state and removes the listener between tests. */
export const resetVbaCufLifecycleContextForTests = (): void => {
  currentContext = VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS;
  hasEnteredForegroundOnce = false;
  hasBackgroundedSinceLastActive = false;
  subscription?.remove();
  subscription = undefined;
};
