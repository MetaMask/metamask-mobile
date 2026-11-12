import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { PredictOrderService } from '../PredictOrderService';

export interface OrderRecoveryLifecycleOptions {
  service: Pick<PredictOrderService, 'resumeRecovery' | 'suspendRecovery'>;
  isUnlocked: () => boolean;
  isSignedIn: () => boolean;
  isEnabled: () => boolean;
  getIdentityScope: () => Promise<string | undefined>;
  subscribeSession: (listener: () => void) => () => void;
  appState?: Pick<typeof AppState, 'currentState' | 'addEventListener'>;
  network?: Pick<typeof NetInfo, 'addEventListener'>;
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
  network = NetInfo,
}: OrderRecoveryLifecycleOptions): (() => void) => {
  let generation = 0;
  let destroyed = false;
  let online = true;
  let active = appState.currentState === 'active';
  const eligible = () => !destroyed && active && online &&
    isUnlocked() && isSignedIn() && isEnabled();
  const resume = () => {
    const captured = ++generation;
    if (!eligible()) {
      service.suspendRecovery();
      return;
    }
    getIdentityScope().then((scope) => {
      if (captured !== generation || !eligible()) {
        return;
      }
      if (scope) {
        service.resumeRecovery(scope).catch(() => undefined);
      } else {
        service.suspendRecovery();
      }
    }).catch(() => {
      if (captured === generation) {
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
