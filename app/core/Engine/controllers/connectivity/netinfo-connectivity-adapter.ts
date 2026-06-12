import {
  type NetInfoState,
  fetch as netInfoFetch,
  addEventListener as netInfoAddEventListener,
  type NetInfoSubscription,
} from '@react-native-community/netinfo';
import {
  CONNECTIVITY_STATUSES,
  type ConnectivityStatus,
  type ConnectivityAdapter,
} from '@metamask/connectivity-controller';

/**
 * A connectivity adapter for React Native using @react-native-community/netinfo.
 *
 * This adapter:
 * - Uses NetInfo to detect network connectivity
 * - Uses `isInternetReachable` for actual internet connectivity (preferred)
 * - Falls back to `isConnected` if `isInternetReachable` is null (still determining)
 * - Fetches initial state asynchronously on subscription
 * - Subscribes to NetInfo state changes
 * - Handles cleanup of NetInfo subscriptions
 *
 * Note: NetInfo's `isInternetReachable` may be null initially while it determines
 * connectivity by making HTTP requests to a reachability URL. We fall back to
 * `isConnected` in this case.
 */
export class NetInfoConnectivityAdapter implements ConnectivityAdapter {
  #removeNetInfoEventListener: NetInfoSubscription | null = null;
  #onConnectivityChangeCallbacks: ((status: ConnectivityStatus) => void)[] = [];
  #currentState: NetInfoState | null = null;

  constructor() {
    // Set up NetInfo event listener once in constructor
    this.#removeNetInfoEventListener = netInfoAddEventListener(
      (state: NetInfoState) => {
        this.#update(state);
      },
    );
  }

  /**
   * Returns the current connectivity status.
   *
   * For initial state, we default to online since NetInfo requires async
   * fetch for initial state. The actual state will be determined once
   * the subscription callback fires or initial fetch completes.
   *
   * @returns The current connectivity status.
   */
  getStatus(): ConnectivityStatus {
    if (!this.#currentState) {
      return CONNECTIVITY_STATUSES.Online;
    }

    // Use isInternetReachable for actual internet connectivity
    // Falls back to isConnected if isInternetReachable is null (still determining)
    const isOnline =
      this.#currentState.isInternetReachable ??
      this.#currentState.isConnected ??
      false;
    return isOnline
      ? CONNECTIVITY_STATUSES.Online
      : CONNECTIVITY_STATUSES.Offline;
  }

  /**
   * Registers a callback to be called when connectivity status changes.
   *
   * Fetches the initial state asynchronously and then subscribes to changes.
   *
   * @param callback - Function called with the new connectivity status.
   */
  onConnectivityChange(callback: (status: ConnectivityStatus) => void): void {
    this.#onConnectivityChangeCallbacks.push(callback);

    // Fetch initial state first
    netInfoFetch().then((state: NetInfoState) => {
      this.#update(state);
    });
  }

  /**
   * Updates the current state and notifies all registered callbacks.
   *
   * @param state - The new NetInfo state.
   */
  #update(state: NetInfoState): void {
    this.#currentState = state;
    const status = this.getStatus();

    this.#onConnectivityChangeCallbacks.forEach((callback) => callback(status));
  }

  /**
   * Cleans up the NetInfo subscription.
   */
  destroy(): void {
    this.#removeNetInfoEventListener?.();
    this.#removeNetInfoEventListener = null;
    this.#onConnectivityChangeCallbacks = [];
    this.#currentState = null;
  }
}
