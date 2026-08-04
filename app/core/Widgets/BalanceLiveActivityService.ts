import { Platform } from 'react-native';

import { strings } from '../../../locales/i18n';
import ReduxService from '../redux/ReduxService';
import Logger from '../../util/Logger';
import { selectPrivacyMode } from '../../selectors/preferencesController';

import {
  BalanceLiveActivity,
  type BalanceLiveActivityProps,
} from './liveActivities/BalanceLiveActivity';
import {
  formatSelectedAccountGroupBalance,
  getSelectedAccountGroupName,
} from './balanceSnapshot';
import { endLiveActivitiesFromPreviousLaunch } from './reconcileLiveActivities';
import { darkWidgetTheme, lightWidgetTheme } from './WidgetTheme';
import type { WithWidgetTheme } from './types';

type BalanceLiveActivityInstance = ReturnType<typeof BalanceLiveActivity.start>;

/**
 * Coalesces rapid Redux updates (balances stream in token-by-token) into a
 * single ActivityKit write. Matches `WidgetUpdaterService`'s debounce, which
 * is fed by the same store subscription.
 */
const UPDATE_DEBOUNCE_MS = 2000;

/**
 * Drives the balance Live Activity's start/update/end lifecycle.
 *
 * Unlike `PerpsLiveActivityService`, this activity's data is plain Redux state
 * — the same balance `WidgetUpdaterService` already pushes to the home screen
 * widget — so it is driven by a store subscription rather than a feature state
 * machine. It is nonetheless a separate service, because its lifetime is not
 * the app's: a Live Activity is explicitly started and ended by the user (from
 * Settings > Developer Options while this is a demo), whereas a widget is
 * always installed or not.
 */
class BalanceLiveActivityServiceImplementation {
  private static instance: BalanceLiveActivityServiceImplementation;

  private unsubscribeFromStore?: () => void;

  private debounceTimer?: ReturnType<typeof setTimeout>;

  private activity?: BalanceLiveActivityInstance;

  /** Skips redundant ActivityKit writes when the computed props haven't changed. */
  private lastSerializedProps?: string;

  private running = false;

  // eslint-disable-next-line no-empty-function -- singleton: construction is intentionally private and does nothing
  private constructor() {}

  static getInstance(): BalanceLiveActivityServiceImplementation {
    if (!BalanceLiveActivityServiceImplementation.instance) {
      BalanceLiveActivityServiceImplementation.instance =
        new BalanceLiveActivityServiceImplementation();
    }
    return BalanceLiveActivityServiceImplementation.instance;
  }

  /**
   * Whether this build can show the activity at all: iOS only (see
   * createMetaMaskLiveActivity.ts) and behind the build-time
   * `MM_WIDGETS_ENABLED` flag. Read by the Developer Options section so it can
   * explain itself rather than offering a button that silently does nothing.
   */
  isSupported(): boolean {
    return Platform.OS === 'ios' && process.env.MM_WIDGETS_ENABLED === 'true';
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Starts the activity and keeps it in sync with the store until `stop()`.
   * Resolves to whether an activity is now on screen — `false` when the build
   * doesn't support it, when privacy mode is suppressing it, or when iOS
   * refused the request (Live Activities disabled for MetaMask in Settings).
   * Safe to call more than once.
   */
  async start(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    if (this.running) {
      return this.activity !== undefined;
    }

    await endLiveActivitiesFromPreviousLaunch(BalanceLiveActivity).catch(
      () => undefined,
    );

    this.running = true;
    this.unsubscribeFromStore = ReduxService.store.subscribe(
      this.handleStateChange,
    );
    this.sync();

    return this.activity !== undefined;
  }

  /** Ends the activity and unsubscribes. Idempotent. */
  stop(): void {
    this.running = false;

    this.unsubscribeFromStore?.();
    this.unsubscribeFromStore = undefined;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    this.endActivity();
  }

  private handleStateChange = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.sync();
    }, UPDATE_DEBOUNCE_MS);
  };

  private sync(): void {
    try {
      const props = this.computeProps();

      if (!props) {
        this.endActivity();
        return;
      }

      const serialized = JSON.stringify(props);
      if (serialized === this.lastSerializedProps) {
        return;
      }
      this.lastSerializedProps = serialized;

      if (this.activity) {
        this.activity.update(props).catch((error) => {
          Logger.error(
            error as Error,
            'BalanceLiveActivityService: Failed to update Live Activity',
          );
        });
        return;
      }

      this.startActivity(props);
    } catch (error) {
      Logger.error(
        error as Error,
        'BalanceLiveActivityService: Failed to sync Live Activity',
      );
    }
  }

  private startActivity(
    props: BalanceLiveActivityProps & WithWidgetTheme,
  ): void {
    try {
      this.activity = BalanceLiveActivity.start(props);
    } catch (error) {
      // Expected when the user has Live Activities switched off for MetaMask,
      // or when iOS refuses the request because the app isn't foregrounded.
      Logger.log(
        'BalanceLiveActivityService: could not start Live Activity',
        (error as Error).message,
      );
      // Force a retry on the next store change rather than treating the
      // un-pushed props as already delivered.
      this.lastSerializedProps = undefined;
    }
  }

  private endActivity(): void {
    const { activity } = this;
    this.activity = undefined;
    this.lastSerializedProps = undefined;

    activity?.end('immediate').catch((error) => {
      Logger.error(
        error as Error,
        'BalanceLiveActivityService: Failed to end Live Activity',
      );
    });
  }

  /**
   * All formatting, translation and privacy handling lives here — never in
   * `BalanceLiveActivity.ios.tsx`, whose layout runs in a sandbox with no
   * access to imports. Returns `undefined` when no activity should be on
   * screen.
   */
  private computeProps():
    | (BalanceLiveActivityProps & WithWidgetTheme)
    | undefined {
    const state = ReduxService.store.getState();

    // A Live Activity is readable on the Lock Screen without unlocking the
    // device, so privacy mode suppresses it outright rather than masking the
    // balance (unlike BalanceWidget, which masks and stays on screen).
    if (selectPrivacyMode(state)) {
      return undefined;
    }

    return {
      accountLabel:
        getSelectedAccountGroupName(state) ??
        strings('widgets.balance_live_activity.default_account_label'),
      label: strings('widgets.balance_widget.label'),
      balanceDisplay: formatSelectedAccountGroupBalance(state),
      theme: { light: lightWidgetTheme, dark: darkWidgetTheme },
    };
  }
}

export const BalanceLiveActivityService =
  BalanceLiveActivityServiceImplementation.getInstance();

export { BalanceLiveActivityServiceImplementation };
