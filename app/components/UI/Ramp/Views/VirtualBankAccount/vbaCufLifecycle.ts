import { AppState } from 'react-native';
import {
  VBA_CUF_LIFECYCLE_CONTEXT,
  type VbaCufLifecycleContext,
} from './vbaCufTags';

let currentContext: VbaCufLifecycleContext =
  VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS;
let hasEnteredForegroundOnce = false;
let subscription: { remove: () => void } | undefined;

const initializeLifecycleTracking = (): void => {
  if (subscription) {
    return;
  }

  let lastState = AppState.currentState;
  hasEnteredForegroundOnce = lastState === 'active';
  subscription = AppState.addEventListener('change', (nextState) => {
    const previousState = lastState;
    lastState = nextState;
    if (
      nextState === 'active' &&
      hasEnteredForegroundOnce &&
      previousState === 'background'
    ) {
      currentContext = VBA_CUF_LIFECYCLE_CONTEXT.BACKGROUND_RESUME;
    }
    if (nextState === 'active') {
      hasEnteredForegroundOnce = true;
    }
  });
};

export const getVbaCufLifecycleContext = (): VbaCufLifecycleContext => {
  initializeLifecycleTracking();
  return currentContext;
};

export const settleVbaCufLifecycleContext = (): void => {
  currentContext = VBA_CUF_LIFECYCLE_CONTEXT.WARM;
};

export const resetVbaCufLifecycleContextForTests = (): void => {
  currentContext = VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS;
  hasEnteredForegroundOnce = false;
  subscription?.remove();
  subscription = undefined;
};
