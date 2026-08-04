import { Platform } from 'react-native';

import ReduxService from '../redux/ReduxService';
import Logger from '../../util/Logger';
import { selectPrivacyMode } from '../../selectors/preferencesController';
import { strings } from '../../../locales/i18n';

import { formatSelectedAccountGroupBalance } from './balanceSnapshot';
import { darkWidgetTheme, lightWidgetTheme } from './WidgetTheme';
import {
  BalanceWidget,
  type BalanceWidgetProps,
} from './widgets/BalanceWidget';
import type { WithWidgetTheme } from './types';
import { trackWidgetAdoption } from './trackWidgetAdoption';

/** Coalesces rapid Redux updates (e.g. balance streaming in token-by-token) into a single native write. */
const UPDATE_DEBOUNCE_MS = 2000;

/**
 * Matches `SensitiveTextLength.Medium` (see
 * app/component-library/components/Texts/SensitiveText/SensitiveText.types.ts)
 * so a hidden widget balance visually matches the hidden balance shown
 * in-app when privacy mode is on.
 */
const HIDDEN_BALANCE_DISPLAY = '•'.repeat(9);

/**
 * Subscribes to the Redux store and pushes throttled snapshot updates to
 * every registered widget whenever the data it depends on changes.
 *
 * This is the ONLY place in the app that should read Redux state on behalf
 * of a widget — widget layout functions themselves cannot use selectors or
 * hooks (see createMetaMaskWidget.ios.ts), so all data-fetching and
 * formatting for every widget lives here, one private `computeXProps` method
 * per widget. See docs/widgets/README.md#adding-a-new-widget for the
 * checklist to follow when adding a new widget kind to this service.
 */
class WidgetUpdaterServiceImplementation {
  private static instance: WidgetUpdaterServiceImplementation;

  private unsubscribeFromStore?: () => void;

  private debounceTimer?: ReturnType<typeof setTimeout>;

  private initialized = false;

  /** Skips redundant native bridge calls when the computed props haven't actually changed. */
  private lastSerializedBalanceProps?: string;

  // eslint-disable-next-line no-empty-function -- singleton: construction is intentionally private and does nothing
  private constructor() {}

  static getInstance(): WidgetUpdaterServiceImplementation {
    if (!WidgetUpdaterServiceImplementation.instance) {
      WidgetUpdaterServiceImplementation.instance =
        new WidgetUpdaterServiceImplementation();
    }
    return WidgetUpdaterServiceImplementation.instance;
  }

  /**
   * Starts listening for Redux state changes and pushes an initial snapshot
   * immediately. Safe to call on every platform — it's a no-op on Android
   * (see createMetaMaskWidget.ts), a no-op unless `MM_WIDGETS_ENABLED` is
   * `'true'` (build-time flag, `builds.yml`'s `_public_envs`, defaults to
   * `'false'` while this feature is still in development — see
   * docs/widgets/README.md), and safe to call more than once. Also
   * fire-and-forgets a one-time widget-adoption analytics report (see
   * trackWidgetAdoption.ts) once per launch.
   */
  initialize(): void {
    if (
      this.initialized ||
      Platform.OS !== 'ios' ||
      process.env.MM_WIDGETS_ENABLED !== 'true'
    ) {
      return;
    }

    this.unsubscribeFromStore = ReduxService.store.subscribe(
      this.handleStateChange,
    );
    this.initialized = true;
    this.pushUpdates();
    trackWidgetAdoption().catch(() => undefined);
    Logger.log('WidgetUpdaterService: Initialized');
  }

  cleanup(): void {
    if (!this.initialized) {
      return;
    }

    this.unsubscribeFromStore?.();
    this.unsubscribeFromStore = undefined;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    this.initialized = false;
    this.lastSerializedBalanceProps = undefined;
  }

  private handleStateChange = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.pushUpdates();
    }, UPDATE_DEBOUNCE_MS);
  };

  /** Recomputes and pushes props for every registered widget. Add a new `push<Widget>Update` call here when adding a widget kind. */
  private pushUpdates(): void {
    this.pushBalanceWidgetUpdate();
  }

  private pushBalanceWidgetUpdate(): void {
    try {
      const props = this.computeBalanceWidgetProps();
      const serialized = JSON.stringify(props);
      if (serialized === this.lastSerializedBalanceProps) {
        return;
      }
      this.lastSerializedBalanceProps = serialized;
      BalanceWidget.updateSnapshot(props);
    } catch (error) {
      Logger.error(
        error as Error,
        'WidgetUpdaterService: Failed to push BalanceWidget update',
      );
    }
  }

  private computeBalanceWidgetProps(): BalanceWidgetProps & WithWidgetTheme {
    const state = ReduxService.store.getState();

    const balanceDisplay = selectPrivacyMode(state)
      ? HIDDEN_BALANCE_DISPLAY
      : formatSelectedAccountGroupBalance(state);

    return {
      balanceDisplay,
      label: strings('widgets.balance_widget.label'),
      theme: { light: lightWidgetTheme, dark: darkWidgetTheme },
    };
  }
}

export const WidgetUpdaterService =
  WidgetUpdaterServiceImplementation.getInstance();

export { WidgetUpdaterServiceImplementation };
