import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

export const TX_AMOUNT_THRESHOLDS = [10, 100, 500, 1000] as const;
export type TxAmountThreshold = (typeof TX_AMOUNT_THRESHOLDS)[number];

const DEFAULT_ENABLED = true;
const DEFAULT_TX_AMOUNT_LIMIT: TxAmountThreshold = 500;

/**
 * Local mirror of the upcoming `@metamask/authenticated-user-storage`
 * `NotificationPreferences.socialAI` slice.
 *
 * The shape is intentionally 1:1 with the forthcoming package:
 *
 * ```ts
 * socialAI: {
 *   enabled: boolean;
 *   txAmountLimit: number;
 *   traderProfileIds: string[]; // opt-in list: notifications fire only
 *                               // for traders whose id is included.
 * }
 * ```
 *
 * Keeping the shape aligned means swapping the in-session `useState`
 * backing for messenger reads/writes against the authenticated user
 * storage controller is a one-file change (this file) and does not
 * touch `NotificationPreferencesView` or the `TraderNotificationRow`.
 */
export interface NotificationPreferences {
  /**
   * Whether trading notifications are globally enabled.
   * Maps to `socialAI.enabled`.
   */
  enabled: boolean;
  /**
   * Dollar threshold for trade notifications.
   * Maps to `socialAI.txAmountLimit`.
   */
  txAmountLimit: TxAmountThreshold;
  /**
   * Profile IDs that are opted in to notifications.
   * Maps to `socialAI.traderProfileIds`.
   *
   * Allow-list semantics: a trader receives notifications iff their
   * id is present in this array.
   */
  traderProfileIds: string[];
}

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  setEnabled: (value: boolean) => void;
  setTxAmountLimit: (value: TxAmountThreshold) => void;
  toggleTraderNotification: (traderId: string) => void;
  /** Derived selector: is the given trader currently opted in? */
  isTraderNotificationEnabled: (traderId: string) => boolean;
}

/**
 * Manages notification-preferences state for the Top Traders feature.
 *
 * Accepts the list of followed traders so newly followed profile IDs
 * are added to `traderProfileIds` with notifications enabled by default
 * (matches the current UX where new rows appear with the switch on).
 * Existing entries are preserved across renders.
 *
 * TODO: When `@metamask/authenticated-user-storage` ships, replace the
 * local `useState` backing below with reads/writes against the
 * authenticated user storage messenger actions. The public hook API is
 * intentionally stable across that swap.
 *
 * @param followedTraders - Traders the current user follows.
 * Only the `id` field is read.
 */
export const useNotificationPreferences = (
  followedTraders: { id: string }[],
): UseNotificationPreferencesResult => {
  // TODO: Read from `@metamask/authenticated-user-storage` (socialAI.enabled).
  const [enabled, setEnabled] = useState<boolean>(DEFAULT_ENABLED);

  // TODO: Read from `@metamask/authenticated-user-storage` (socialAI.txAmountLimit).
  const [txAmountLimit, setTxAmountLimit] = useState<TxAmountThreshold>(
    DEFAULT_TX_AMOUNT_LIMIT,
  );

  // TODO: Read from `@metamask/authenticated-user-storage` (socialAI.traderProfileIds).
  // Opt-in allow-list: a trader receives notifications iff their id is in here.
  const [traderProfileIds, setTraderProfileIds] = useState<string[]>(() =>
    followedTraders.map((trader) => trader.id),
  );

  // Track trader ids we've already initialized so we only opt new rows in
  // *once*. Using a ref (not state) avoids re-adding a trader after the user
  // explicitly opts them out — absence from `traderProfileIds` is then
  // unambiguously an opt-out.
  const initializedTraderIdsRef = useRef<Set<string>>(
    new Set(followedTraders.map((trader) => trader.id)),
  );

  // When the followed-traders list changes, opt newly-followed ids in by
  // default. Traders the user has seen before — including those they've
  // explicitly opted out of — are left untouched.
  useEffect(() => {
    const seen = initializedTraderIdsRef.current;
    const additions: string[] = [];
    followedTraders.forEach((trader) => {
      if (!seen.has(trader.id)) {
        seen.add(trader.id);
        additions.push(trader.id);
      }
    });
    if (additions.length > 0) {
      setTraderProfileIds((prev) => [...prev, ...additions]);
    }
  }, [followedTraders]);

  const toggleTraderNotification = useCallback((traderId: string) => {
    // TODO: Persist via `@metamask/authenticated-user-storage`
    // (socialAI.traderProfileIds — add/remove).
    setTraderProfileIds((prev) =>
      prev.includes(traderId)
        ? prev.filter((id) => id !== traderId)
        : [...prev, traderId],
    );
  }, []);

  const handleSetEnabled = useCallback((value: boolean) => {
    // TODO: Persist via `@metamask/authenticated-user-storage` (socialAI.enabled).
    setEnabled(value);
  }, []);

  const handleSetTxAmountLimit = useCallback((value: TxAmountThreshold) => {
    // TODO: Persist via `@metamask/authenticated-user-storage` (socialAI.txAmountLimit).
    setTxAmountLimit(value);
  }, []);

  const isTraderNotificationEnabled = useCallback(
    (traderId: string) => traderProfileIds.includes(traderId),
    [traderProfileIds],
  );

  const preferences = useMemo<NotificationPreferences>(
    () => ({
      enabled,
      txAmountLimit,
      traderProfileIds,
    }),
    [enabled, txAmountLimit, traderProfileIds],
  );

  return {
    preferences,
    setEnabled: handleSetEnabled,
    setTxAmountLimit: handleSetTxAmountLimit,
    toggleTraderNotification,
    isTraderNotificationEnabled,
  };
};

export default useNotificationPreferences;
