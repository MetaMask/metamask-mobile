import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
  Platform,
} from 'react-native';
import Logger from '../../util/Logger';
import ReduxService from '../redux';
import { WidgetBridge } from '../NativeModules';
import { buildWidgetPayload, WidgetTokenPayload } from './buildWidgetPayload';
import { syncWidgetLogos } from './syncWidgetLogos';

/**
 * Debounce window for store-driven syncs. Balances are recomputed on many Redux
 * ticks; we coalesce them so the native bridge writes/downloads at most once per
 * window.
 */
const SYNC_DEBOUNCE_MS = 5_000;

/**
 * Manages the iOS home-screen token widget: pushes the current token list into
 * the widget's App Group container on app-state transitions and (debounced) on
 * Redux store changes.
 *
 * No-ops on Android and on builds where the native {@link WidgetBridge} module
 * is absent (e.g. Flask), so it is safe to construct unconditionally.
 */
export class WidgetSyncManager {
  private appStateSubscription: NativeEventSubscription | null = null;
  private storeUnsubscribe: (() => void) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSerialized: string | null = null;

  constructor() {
    if (!this.isSupported()) {
      return;
    }
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
    // Defensive: the Redux store may not be registered yet at Engine-init time.
    // A failure here must never break Engine construction — the AppState
    // listener will still drive syncs once the app is interactive.
    try {
      this.storeUnsubscribe = ReduxService.store.subscribe(
        this.scheduleDebouncedSync,
      );
      // Initial push so the widget reflects state from app start.
      this.sync();
    } catch (error) {
      Logger.error(
        error as Error,
        'WidgetSyncManager: store not ready at init',
      );
    }
  }

  private isSupported(): boolean {
    return Platform.OS === 'ios' && Boolean(WidgetBridge?.setTokens);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    // Refresh on foreground (fresh prices) and before backgrounding (so the
    // last seen state is captured for the home screen).
    if (nextAppState === 'active' || nextAppState === 'background') {
      this.sync();
    }
  };

  private scheduleDebouncedSync = (): void => {
    if (this.debounceTimer) {
      return;
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.sync();
    }, SYNC_DEBOUNCE_MS);
  };

  /**
   * Build the payload from current state and push it to the widget. Skips the
   * native call when the payload is unchanged since the last push. Dedup runs on
   * the pre-logo payload (which is deterministic for a given state), so cached
   * logos aren't re-downloaded on every Redux tick.
   */
  sync(): void {
    if (!this.isSupported()) {
      return;
    }
    try {
      const payload = buildWidgetPayload(ReduxService.store.getState());
      const serialized = JSON.stringify(payload);
      if (serialized === this.lastSerialized) {
        return;
      }
      this.lastSerialized = serialized;
      this.pushToWidget(payload).catch((error: unknown) => {
        Logger.error(error as Error, 'WidgetSyncManager: push failed');
      });
    } catch (error) {
      Logger.error(error as Error, 'WidgetSyncManager: sync failed');
    }
  }

  /**
   * Downloads the token logos into the widget's App Group container (in JS) and
   * writes the final payload through the native bridge.
   */
  private async pushToWidget(payload: WidgetTokenPayload): Promise<void> {
    const output = await syncWidgetLogos(payload);
    await WidgetBridge.setTokens(JSON.stringify(output));
  }

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
