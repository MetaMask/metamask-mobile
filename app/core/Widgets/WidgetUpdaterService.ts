import { Platform } from 'react-native';
import { createFormatters } from '@metamask/client-utils';

import ReduxService from '../redux/ReduxService';
import Logger from '../../util/Logger';
import { getLocaleLanguageCode } from '../../components/hooks/useFormatters';
import { selectBalanceBySelectedAccountGroup } from '../../selectors/assets/balances';
import { selectPrivacyMode } from '../../selectors/preferencesController';
import { strings } from '../../../locales/i18n';

import { darkWidgetTheme, lightWidgetTheme } from './WidgetTheme';
import { BalanceWidget } from './widgets/BalanceWidget';
import type { BalanceWidgetProps } from './widgets/BalanceWidget.ios';
import type { WithWidgetTheme } from './types';

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
 * `selectBalanceBySelectedAccountGroup` is a selector *factory* — each call
 * builds a fresh `createSelector` instance. It must be instantiated once and
 * reused, otherwise every read re-runs the (expensive) all-wallets balance
 * aggregation from scratch and re-triggers Reselect's dev-only warnings.
 */
const selectBalance = selectBalanceBySelectedAccountGroup();

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
   * (see createMetaMaskWidget.android.ts), and safe to call more than once.
   */
  initialize(): void {
    if (this.initialized || Platform.OS !== 'ios') {
      return;
    }

    this.unsubscribeFromStore = ReduxService.store.subscribe(
      this.handleStateChange,
    );
    this.initialized = true;
    this.pushUpdates();
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
    const balance = selectBalance(state);
    const isPrivacyModeEnabled = selectPrivacyMode(state);

    const balanceDisplay = isPrivacyModeEnabled
      ? HIDDEN_BALANCE_DISPLAY
      : createFormatters({ locale: getLocaleLanguageCode() }).formatCurrency(
          balance?.totalBalanceInUserCurrency ?? 0,
          balance?.userCurrency ?? 'usd',
        );

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
