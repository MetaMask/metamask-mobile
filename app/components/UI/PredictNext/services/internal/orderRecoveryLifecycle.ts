import { AppState } from 'react-native';
import { addEventListener as netInfoAddEventListener } from '@react-native-community/netinfo';
import type { PredictOrderService } from '../PredictOrderService';

/** Named import, not the module default: consumers of this lifecycle (Engine
 * tests among them) mock the module's named exports only. */
const defaultNetwork = {
  addEventListener: netInfoAddEventListener,
};

export interface OrderRecoveryLifecycleOptions {
  service: Pick<
    PredictOrderService,
    'resumeRecovery' | 'suspendRecovery' | 'getRecoveryGeneration'
  >;
  isUnlocked: () => boolean;
  isSignedIn: () => boolean;
  isEnabled: () => boolean;
  getIdentityScope: () => Promise<string | undefined>;
  subscribeSession: (listener: () => void) => () => void;
  appState?: Pick<typeof AppState, 'currentState' | 'addEventListener'>;
  network?: { addEventListener: typeof netInfoAddEventListener };
}

/** Identity is the authenticated canonical Predict User, never a selected
 * wallet account. Every async identity resolution is generation-fenced. */
export const bindOrderRecoveryLifecycle = ({
  service,
  isUnlocked,
  isSignedIn,
  isEnabled,
  getIdentityScope,
  subscribeSession,
  appState = AppState,
  network = defaultNetwork,
}: OrderRecoveryLifecycleOptions): (() => void) => {
  let generation = 0;
  let destroyed = false;
  let online = true;
  let active = appState.currentState === 'active';
  const eligible = () =>
    !destroyed &&
    active &&
    online &&
    isUnlocked() &&
    isSignedIn() &&
    isEnabled();
  const resume = () => {
    const captured = ++generation;
    if (!eligible()) {
      service.suspendRecovery();
      return;
    }
    const serviceGeneration = service.getRecoveryGeneration();
    getIdentityScope()
      .then((scope) => {
        if (
          captured !== generation ||
          serviceGeneration !== service.getRecoveryGeneration() ||
          !eligible()
        ) {
          return;
        }
        if (scope) {
          service.resumeRecovery(scope).catch(() => undefined);
        } else {
          service.suspendRecovery();
        }
      })
      .catch(() => {
        if (
          captured === generation &&
          serviceGeneration === service.getRecoveryGeneration()
        ) {
          service.suspendRecovery();
        }
      });
  };
  const unsubscribeSession = subscribeSession(resume);
  const appSubscription = appState.addEventListener('change', (state) => {
    active = state === 'active';
    resume();
  });
  const unsubscribeNetwork = network.addEventListener((state) => {
    const wasOnline = online;
    online = state.isConnected !== false && state.isInternetReachable !== false;
    if (!online || !wasOnline) {
      resume();
    }
  });
  resume();
  return () => {
    destroyed = true;
    generation += 1;
    unsubscribeSession();
    appSubscription.remove();
    unsubscribeNetwork();
    service.suspendRecovery();
  };
};
