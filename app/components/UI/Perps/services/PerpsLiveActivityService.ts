import { Platform } from 'react-native';
import type { Position, PriceUpdate } from '@metamask/perps-controller';

import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import ReduxService from '../../../../core/redux/ReduxService';
import {
  PerpsPnlLiveActivity,
  type PerpsPnlLiveActivityProps,
} from '../../../../core/Widgets/liveActivities/PerpsPnlLiveActivity';
import { endLiveActivitiesFromPreviousLaunch } from '../../../../core/Widgets/reconcileLiveActivities';
import {
  darkWidgetTheme,
  lightWidgetTheme,
} from '../../../../core/Widgets/WidgetTheme';
import type { WithWidgetTheme } from '../../../../core/Widgets/types';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import Logger from '../../../../util/Logger';
import { enrichPositionsWithLivePnL } from '../hooks/stream/usePerpsLivePositions';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import {
  formatLeverage,
  formatPerpsPrice,
  formatPercentage,
  formatPnl,
} from '../utils/formatUtils';

type PerpsPnlLiveActivityInstance = ReturnType<
  typeof PerpsPnlLiveActivity.start
>;

/**
 * Applied to both the position and the price stream subscriptions.
 *
 * ActivityKit budgets how often a Live Activity may be updated, and a perps
 * price feed ticks far faster than a Lock Screen card is worth redrawing. 2s
 * keeps the P/L visibly live while staying well inside that budget; combined
 * with the identical-props check in `sync()` a quiet market produces no
 * updates at all.
 */
const UPDATE_THROTTLE_MS = 2000;

/**
 * Stop retrying `start()` after this many consecutive failures, so a device
 * where the user has Live Activities switched off doesn't get a failed
 * ActivityKit request on every price tick for the rest of the session.
 */
const MAX_START_FAILURES = 3;

/**
 * Drives the Perps P/L Live Activity's start/update/end lifecycle from the
 * Perps WebSocket streams.
 *
 * This is deliberately NOT part of `WidgetUpdaterService`: that service exists
 * to fan a debounced Redux snapshot out to home screen widgets, whereas
 * individual perps positions never enter Redux at all — they only exist in
 * `PerpsStreamManager`'s channels. A Live Activity is also a state machine
 * (start on open, update while open, end on close) rather than a standing
 * snapshot, which is why `docs/widgets/README.md` assigns Live Activity
 * lifecycles to the owning feature.
 *
 * Started/stopped by `PerpsAlwaysOnProvider`, which already owns the app-wide
 * Perps connection lifecycle.
 */
class PerpsLiveActivityServiceImplementation {
  private static instance: PerpsLiveActivityServiceImplementation;

  private unsubscribeFromPositions?: () => void;

  private unsubscribeFromPrices?: () => void;

  /** Symbol the price subscription is currently scoped to, if any. */
  private subscribedSymbol?: string;

  private activity?: PerpsPnlLiveActivityInstance;

  private positions: Position[] = [];

  private prices: Record<string, PriceUpdate> = {};

  /** Skips redundant ActivityKit writes when the computed props haven't changed. */
  private lastSerializedProps?: string;

  private startFailureCount = 0;

  private started = false;

  // eslint-disable-next-line no-empty-function -- singleton: construction is intentionally private and does nothing
  private constructor() {}

  static getInstance(): PerpsLiveActivityServiceImplementation {
    if (!PerpsLiveActivityServiceImplementation.instance) {
      PerpsLiveActivityServiceImplementation.instance =
        new PerpsLiveActivityServiceImplementation();
    }
    return PerpsLiveActivityServiceImplementation.instance;
  }

  /**
   * Subscribes to the position stream and begins mirroring the largest open
   * position into a Live Activity. Safe to call on every platform (no-op on
   * Android, see createMetaMaskLiveActivity.ts), a no-op unless the
   * build-time `MM_WIDGETS_ENABLED` flag is `'true'`, and safe to call more
   * than once.
   */
  start(): void {
    if (
      this.started ||
      Platform.OS !== 'ios' ||
      process.env.MM_WIDGETS_ENABLED !== 'true'
    ) {
      return;
    }
    this.started = true;

    endLiveActivitiesFromPreviousLaunch(PerpsPnlLiveActivity).catch(
      () => undefined,
    );

    // A Live Activity is a nice-to-have garnish on the Perps experience, and
    // this runs from an effect in the wallet's render tree. Swallow everything,
    // matching PerpsAlwaysOnProvider's contract that a perps-side failure can
    // never take the wallet down with it.
    try {
      this.unsubscribeFromPositions =
        getStreamManagerInstance().positions.subscribe({
          callback: this.handlePositions,
          throttleMs: UPDATE_THROTTLE_MS,
        });
      DevLogger.log('PerpsLiveActivityService: started');
    } catch (error) {
      Logger.error(
        error as Error,
        'PerpsLiveActivityService: Failed to subscribe to the position stream',
      );
    }
  }

  /**
   * Unsubscribes from both streams and ends any running activity. Idempotent,
   * and restores the service to the exact state a fresh instance starts in so
   * a later `start()` behaves identically to the first one.
   */
  stop(): void {
    this.started = false;

    this.unsubscribeFromPositions?.();
    this.unsubscribeFromPositions = undefined;
    this.unsubscribeFromPrices?.();
    this.unsubscribeFromPrices = undefined;
    this.subscribedSymbol = undefined;

    this.positions = [];
    this.prices = {};
    this.startFailureCount = 0;
    this.endActivity();

    DevLogger.log('PerpsLiveActivityService: stopped');
  }

  private handlePositions = (positions: Position[] | null): void => {
    // `null` is the channel's "cleared" signal (account switch): drop the
    // activity rather than keeping the previous account's P/L on screen.
    this.positions = positions ?? [];
    this.syncPriceSubscription();
    this.sync();
  };

  private handlePrices = (prices: Record<string, PriceUpdate>): void => {
    if (!prices) {
      return;
    }
    // An empty payload is the channel's cache-clear signal (reconnect,
    // provider change, account switch) — reset rather than merge, so a stale
    // mark price can't drive P/L until fresh ticks arrive.
    this.prices = Object.keys(prices).length === 0 ? {} : prices;
    this.sync();
  };

  /**
   * Keeps the price subscription scoped to exactly the symbol currently being
   * displayed, so the activity gets live mark prices without subscribing to
   * the whole price channel.
   */
  private syncPriceSubscription(): void {
    const symbol = this.selectPosition()?.symbol;
    if (symbol === this.subscribedSymbol) {
      return;
    }

    this.unsubscribeFromPrices?.();
    this.unsubscribeFromPrices = undefined;
    this.subscribedSymbol = symbol;
    this.prices = {};

    if (!symbol) {
      return;
    }

    this.unsubscribeFromPrices =
      getStreamManagerInstance().prices.subscribeToSymbols({
        symbols: [symbol],
        callback: this.handlePrices,
        throttleMs: UPDATE_THROTTLE_MS,
      });
  }

  /**
   * The position to surface. A Live Activity has one banner and one Dynamic
   * Island slot, so with several positions open this picks the largest by
   * notional value — the one whose P/L moves the account most.
   */
  private selectPosition(): Position | undefined {
    return this.positions.reduce<Position | undefined>((largest, position) => {
      if (!largest) {
        return position;
      }
      return notionalValue(position) > notionalValue(largest)
        ? position
        : largest;
    }, undefined);
  }

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
            'PerpsLiveActivityService: Failed to update Live Activity',
          );
        });
        return;
      }

      this.startActivity(props);
    } catch (error) {
      Logger.error(
        error as Error,
        'PerpsLiveActivityService: Failed to sync Live Activity',
      );
    }
  }

  private startActivity(
    props: PerpsPnlLiveActivityProps & WithWidgetTheme,
  ): void {
    if (this.startFailureCount >= MAX_START_FAILURES) {
      return;
    }

    try {
      this.activity = PerpsPnlLiveActivity.start(props);
      this.startFailureCount = 0;
    } catch (error) {
      this.startFailureCount += 1;
      // Expected when the user has Live Activities disabled for MetaMask, or
      // when iOS refuses the request because the app isn't foregrounded.
      DevLogger.log('PerpsLiveActivityService: could not start Live Activity', {
        attempt: this.startFailureCount,
        error: (error as Error).message,
      });
      // Force a retry on the next tick rather than treating the un-pushed
      // props as already delivered.
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
        'PerpsLiveActivityService: Failed to end Live Activity',
      );
    });
  }

  /**
   * All formatting, translation and privacy handling for the activity lives
   * here — never in `PerpsPnlLiveActivity.ios.tsx`, whose layout function runs
   * in a sandbox with no access to imports. Returns `undefined` when no
   * activity should be on screen.
   */
  private computeProps():
    | (PerpsPnlLiveActivityProps & WithWidgetTheme)
    | undefined {
    // A Live Activity is readable on the Lock Screen without unlocking the
    // device, so privacy mode suppresses it outright rather than masking the
    // numbers (unlike BalanceWidget, which sits behind Face ID on the home
    // screen).
    if (selectPrivacyMode(ReduxService.store.getState())) {
      return undefined;
    }

    const rawPosition = this.selectPosition();
    if (!rawPosition) {
      return undefined;
    }

    const [position] = enrichPositionsWithLivePnL([rawPosition], this.prices);

    const size = Number.parseFloat(position.size);
    const pnl = Number.parseFloat(position.unrealizedPnl);
    const roe = Number.parseFloat(position.returnOnEquity);
    const markPrice =
      this.prices[position.symbol]?.price ?? impliedMarkPrice(position);

    return {
      symbol: position.symbol,
      directionLabel: strings('widgets.perps_pnl_live_activity.direction', {
        direction: strings(
          size >= 0 ? 'perps.market.long' : 'perps.market.short',
        ),
        leverage: formatLeverage(position.leverage?.value ?? 1),
      }),
      isProfit: pnl >= 0,
      pnlLabel: strings('perps.unrealized_pnl'),
      pnlDisplay: formatPnl(Number.isNaN(pnl) ? 0 : pnl),
      roeDisplay: formatPercentage(Number.isNaN(roe) ? 0 : roe * 100, 1),
      entryPriceLabel: strings('perps.tpsl.entry_price'),
      entryPriceDisplay: formatPerpsPrice(position.entryPrice),
      markPriceLabel: strings('perps.market.mark_price'),
      markPriceDisplay: formatPerpsPrice(markPrice),
      theme: { light: lightWidgetTheme, dark: darkWidgetTheme },
    };
  }
}

/** Absolute notional value of a position, used to pick the most significant one. */
function notionalValue(position: Position): number {
  const value = Math.abs(Number.parseFloat(position.positionValue));
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Mark price implied by the position itself, for the window between the
 * activity starting and the first price tick arriving.
 */
function impliedMarkPrice(position: Position): string {
  const size = Math.abs(Number.parseFloat(position.size));
  const value = Math.abs(Number.parseFloat(position.positionValue));
  if (!size || Number.isNaN(size) || Number.isNaN(value)) {
    return position.entryPrice;
  }
  return (value / size).toString();
}

export const PerpsLiveActivityService =
  PerpsLiveActivityServiceImplementation.getInstance();

export { PerpsLiveActivityServiceImplementation };
