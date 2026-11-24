import { AppState } from 'react-native';
import { addEventListener as netInfoAddEventListener } from '@react-native-community/netinfo';
import {
  computeNetworkTier,
  readCellularGeneration,
} from '../../../../../util/deviceCapability/computeNetworkTier';
import type { PredictFundingService } from '../PredictFundingService';

/** Named import, not the module default: consumers of this lifecycle (Engine
 * tests among them) mock the module's named exports only. */
const defaultNetwork = {
  addEventListener: netInfoAddEventListener,
};

export interface DepositResumeLifecycleOptions {
  service: Pick<
    PredictFundingService,
    'resumeDeposits' | 'stopDepositPolling' | 'setDepositNetworkTier'
  >;
  isKalshiActive: () => boolean;
  isUnlocked: () => boolean;
  isSignedIn: () => boolean;
  subscribeSession: (listener: (forceResume?: boolean) => void) => () => void;
  appState?: Pick<typeof AppState, 'currentState' | 'addEventListener'>;
  network?: { addEventListener: typeof netInfoAddEventListener };
}

/**
 * Binds `PredictFundingService`'s deposit resume and polling to the app's
 * lifecycle, wallet lock state, Active Venue, and network capability tier.
 *
 * Resumes open Kalshi deposits on start, unlock, foreground, sign-in, or
 * switch to Kalshi when the Kalshi lane is active, the wallet is unlocked,
 * the user is signed in, the app is active, and the device is not offline.
 * Stops polling when locked, signed out, backgrounded, offline, or when
 * another Venue is active, and forwards the NetInfo `NetworkTier` (`NONE`,
 * `SLOW_CELLULAR`, etc.) to `PredictFundingService`.
 */
export const bindDepositResumeLifecycle = ({
  service,
  isKalshiActive,
  isUnlocked,
  isSignedIn,
  subscribeSession,
  appState = AppState,
  network = defaultNetwork,
}: DepositResumeLifecycleOptions): (() => void) => {
  let destroyed = false;
  let active = appState.currentState === 'active';
  let wasEligible = false;

  const isEligible = (): boolean =>
    !destroyed && active && isUnlocked() && isSignedIn() && isKalshiActive();

  const sync = (forceResume = false): void => {
    const eligible = isEligible();
    if (!eligible) {
      wasEligible = false;
      service.stopDepositPolling();
      return;
    }
    const shouldResume = forceResume || !wasEligible;
    wasEligible = true;
    if (shouldResume) {
      service.resumeDeposits().catch(() => undefined);
    }
  };

  const unsubscribeSession = subscribeSession((forceResume = false) =>
    sync(forceResume),
  );

  const appSubscription = appState.addEventListener('change', (state) => {
    const nextActive = state === 'active';
    if (nextActive === active) {
      return;
    }
    active = nextActive;
    // Returning to foreground starts a fresh resume pass when eligible.
    sync(nextActive);
  });

  const unsubscribeNetwork = network.addEventListener((state) => {
    const nextTier = computeNetworkTier({
      type: state.type,
      cellularGeneration: readCellularGeneration(state.details),
      isInternetReachable:
        state.isConnected === false ? false : state.isInternetReachable,
    });
    service.setDepositNetworkTier(nextTier);
  });

  sync(true);

  return () => {
    destroyed = true;
    wasEligible = false;
    unsubscribeSession();
    appSubscription.remove();
    unsubscribeNetwork();
    service.stopDepositPolling();
  };
};
