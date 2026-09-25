import { AppState } from 'react-native';
import { TraceName } from '../../../../util/trace';
import {
  RAMPS_BUY_LIFECYCLE_CONTEXT,
  type RampsBuyLifecycleContext,
} from '../constants/rampsBuyCufTags';

/** Track whether a Buy span begins cold, warm, or after an app resume. */
let currentContext: RampsBuyLifecycleContext =
  RAMPS_BUY_LIFECYCLE_CONTEXT.COLD_PROCESS;
let hasEnteredForegroundOnce = false;
let subscription: { remove: () => void } | undefined;

const FOREGROUND_SETTLING_SPANS = new Set<TraceName>([
  TraceName.RampScreenLoad,
  TraceName.RampBuyToOrderDetails,
]);

export function settleRampsBuyForegroundOnSpan(name: TraceName): void {
  if (FOREGROUND_SETTLING_SPANS.has(name)) {
    currentContext = RAMPS_BUY_LIFECYCLE_CONTEXT.WARM;
  }
}

function initRampsBuyLifecycleTracking(): void {
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
      (previousState === 'background' || previousState === 'inactive')
    ) {
      currentContext = RAMPS_BUY_LIFECYCLE_CONTEXT.BACKGROUND_RESUME;
    }
    if (nextState === 'active') {
      hasEnteredForegroundOnce = true;
    }
  });
}

export function getRampsBuyLifecycleContext(): RampsBuyLifecycleContext {
  initRampsBuyLifecycleTracking();
  return currentContext;
}

export function resetRampsBuyLifecycleContextForTests(): void {
  currentContext = RAMPS_BUY_LIFECYCLE_CONTEXT.COLD_PROCESS;
  hasEnteredForegroundOnce = false;
  subscription?.remove();
  subscription = undefined;
}
