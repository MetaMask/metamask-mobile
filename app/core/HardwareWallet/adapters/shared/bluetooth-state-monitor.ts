import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { State as BleState } from 'react-native-ble-plx';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

/**
 * Monitors the system Bluetooth state and notifies subscribers.
 *
 * Encapsulates the `TransportBLE.observeState` subscription, the
 * initial-state promise (awaited by `HardwareWalletAdapter.isTransportAvailable`),
 * and the transport-state callback set. Shared by the Ledger BLE adapters so
 * neither re-implements this bookkeeping.
 */
export class BluetoothStateMonitor {
  #isBluetoothOn = false;
  #hasReceivedInitialState = false;
  readonly #initialStatePromise: Promise<void>;
  #resolveInitialState: (() => void) | null = null;
  #subscription: { unsubscribe: () => void } | null = null;
  readonly #callbacks: Set<(isAvailable: boolean) => void> = new Set();

  constructor() {
    this.#initialStatePromise = new Promise((resolve) => {
      this.#resolveInitialState = resolve;
    });
    this.start();
  }

  /**
   * Whether Bluetooth is currently powered on.
   */
  get isOn(): boolean {
    return this.#isBluetoothOn;
  }

  /**
   * Whether at least one BLE state has been observed (or an error occurred).
   */
  get hasReceivedInitialState(): boolean {
    return this.#hasReceivedInitialState;
  }

  /**
   * Resolves once the first BLE state has been observed (or on error).
   */
  waitForInitialState(): Promise<void> {
    return this.#initialStatePromise;
  }

  /**
   * Register a transport-state listener.
   *
   * The listener is invoked immediately with the current state and on every
   * subsequent change.
   *
   * @param callback - Called with the current Bluetooth availability.
   * @returns An unsubscribe function.
   */
  onChange(callback: (isAvailable: boolean) => void): () => void {
    this.#callbacks.add(callback);

    callback(this.#isBluetoothOn);

    return () => {
      this.#callbacks.delete(callback);
    };
  }

  /**
   * Subscribe to `TransportBLE.observeState` and track Bluetooth availability.
   */
  start(): void {
    DevLogger.log('[BluetoothStateMonitor] Starting Bluetooth monitoring');

    this.#subscription = TransportBLE.observeState({
      next: (event) => {
        const wasOn = this.#isBluetoothOn;
        const isFirstState = !this.#hasReceivedInitialState;

        // Compare as string to avoid BleState type issues
        this.#isBluetoothOn =
          event.available && event.type === BleState.PoweredOn;

        DevLogger.log(
          '[BluetoothStateMonitor] BLE state:',
          event.type,
          'available:',
          event.available,
          '-> isBluetoothOn:',
          this.#isBluetoothOn,
        );

        // Resolve initial state promise on first update
        if (isFirstState) {
          this.#resolveInitialStateIfPending();
        }

        // Notify listeners if state changed (or on first state)
        if (wasOn !== this.#isBluetoothOn || isFirstState) {
          this.#notify();
        }
      },
      error: (error: Error) => {
        DevLogger.log('[BluetoothStateMonitor] BLE state error:', error);
        this.#isBluetoothOn = false;

        // Also resolve initial state promise on error
        if (!this.#hasReceivedInitialState) {
          this.#resolveInitialStateIfPending();
        }

        this.#notify();
      },
      complete: () => undefined,
    });
  }

  /**
   * Stop observing the BLE state.
   */
  stop(): void {
    if (this.#subscription) {
      this.#subscription.unsubscribe();
      this.#subscription = null;
    }
  }

  /**
   * Tear down the monitor: stop observing, resolve any pending initial-state
   * promise, and clear all listeners. Called from the adapter's `destroy()`.
   */
  dispose(): void {
    this.stop();
    this.#resolveInitialStateIfPending();
    this.#callbacks.clear();
  }

  /**
   * Resolve the initial-state promise if still pending.
   */
  #resolveInitialStateIfPending(): void {
    this.#hasReceivedInitialState = true;
    if (this.#resolveInitialState) {
      this.#resolveInitialState();
      this.#resolveInitialState = null;
    }
  }

  #notify(): void {
    for (const callback of this.#callbacks) {
      try {
        callback(this.#isBluetoothOn);
      } catch (error) {
        DevLogger.log(
          '[BluetoothStateMonitor] Error in transport state callback:',
          error,
        );
      }
    }
  }
}
