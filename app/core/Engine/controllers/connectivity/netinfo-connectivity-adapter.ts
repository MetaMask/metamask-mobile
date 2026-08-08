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
 * - Fetches initial state on demand via {@link getStatus} (used by the controller's `init()`)
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
   * If no NetInfo state has been observed yet, fetches it asynchronously so
   * the controller's `init()` resolves with an accurate initial value rather
   * than a default-online guess.
   *
   * @returns A promise resolving to the current connectivity status.
   */
  async getStatus(): Promise<ConnectivityStatus> {
    if (!this.#currentState) {
      const fetched = await netInfoFetch();
      // A NetInfo event may have populated `#currentState` while the fetch
      // was in flight; that listener-supplied state is at least as fresh as
      // the fetched snapshot, so only seed when we still have nothing.
      if (!this.#currentState) {
        this.#currentState = fetched;
      }
    }
    return this.#statusFromState(this.#currentState);
  }

  /**
   * Registers a callback to be called when connectivity status changes.
   *
   * Initial status is fetched by the controller's `init()` via
   * {@link getStatus}; this method only subscribes to subsequent changes.
   *
   * @param callback - Function called with the new connectivity status.
   */
  onConnectivityChange(callback: (status: ConnectivityStatus) => void): void {
    this.#onConnectivityChangeCallbacks.push(callback);
  }

  /**
   * Derives a {@link ConnectivityStatus} from a NetInfo state.
   *
   * Uses `isInternetReachable` for actual internet connectivity and falls
   * back to `isConnected` if `isInternetReachable` is null (still determining).
   *
   * @param state - The NetInfo state to inspect.
   * @returns The derived connectivity status.
   */
  #statusFromState(state: NetInfoState): ConnectivityStatus {
    const isOnline = state.isInternetReachable ?? state.isConnected ?? false;
    return isOnline
      ? CONNECTIVITY_STATUSES.Online
      : CONNECTIVITY_STATUSES.Offline;
  }

  /**
   * Updates the current state and notifies all registered callbacks.
   *
   * @param state - The new NetInfo state.
   */
  #update(state: NetInfoState): void {
    this.#currentState = state;
    const status = this.#statusFromState(state);

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
