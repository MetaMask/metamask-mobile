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
  hasBackgroundedSinceLastActive = false;
  subscription?.remove();
  subscription = undefined;
};
