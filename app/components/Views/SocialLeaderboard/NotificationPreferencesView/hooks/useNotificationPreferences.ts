import { useState, useCallback, useEffect } from 'react';
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';

export const TX_AMOUNT_THRESHOLDS = [10, 100, 500, 1000] as const;
export type TxAmountThreshold = (typeof TX_AMOUNT_THRESHOLDS)[number];

const DEFAULT_ENABLED = true;
const DEFAULT_TX_AMOUNT_LIMIT: TxAmountThreshold = 500;

export interface NotificationPreferences {
  /**
   * Whether trading notifications are globally enabled.
   * Maps to socialAI.enabled.
   */
  enabled: boolean;
  /**
   * Dollar threshold for trade notifications.
   * Maps to socialAI.txAmountLimit.
   */
  txAmountLimit: TxAmountThreshold;
  /**
   * Per-trader notification toggles keyed by trader profile ID.
   * Maps to socialAI.traderProfileIds.
   * true = receive notifications, false = muted.
   */
  traderNotifications: Record<string, boolean>;
}

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  setEnabled: (value: boolean) => void;
  setTxAmountLimit: (value: TxAmountThreshold) => void;
  toggleTraderNotification: (traderId: string) => void;
}

/**
 * Manages local notification preference state for the Top Traders feature.
 *
 * Accepts the list of followed traders so per-trader toggles can be
 * initialised from them. New traders added to the follow list default to
 * notifications enabled.
 *
 * TODO: When the backend ships, replace the local useState calls below with
 * reads/writes via SocialController (socialAI.enabled, socialAI.txAmountLimit,
 * socialAI.traderProfileIds) using the existing messenger pattern.
 *
 * @param followedTraders - Traders the current user follows (from useTopTraders).
 */
export const useNotificationPreferences = (
  followedTraders: Pick<TopTrader, 'id'>[],
): UseNotificationPreferencesResult => {
  // TODO: Replace with read from SocialController state (socialAI.enabled)
  const [enabled, setEnabled] = useState<boolean>(DEFAULT_ENABLED);

  // TODO: Replace with read from SocialController state (socialAI.txAmountLimit)
  const [txAmountLimit, setTxAmountLimit] = useState<TxAmountThreshold>(
    DEFAULT_TX_AMOUNT_LIMIT,
  );

  // TODO: Replace with read from SocialController state (socialAI.traderProfileIds)
  const [traderNotifications, setTraderNotifications] = useState<
    Record<string, boolean>
  >(() =>
    followedTraders.reduce<Record<string, boolean>>((acc, trader) => {
      acc[trader.id] = false;
      return acc;
    }, {}),
  );

  // When the followed traders list changes, add new traders defaulting to disabled.
  // Existing trader preferences are preserved.
  useEffect(() => {
    setTraderNotifications((prev) => {
      const updated = { ...prev };
      let changed = false;
      followedTraders.forEach((trader) => {
        if (!(trader.id in updated)) {
          updated[trader.id] = false;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [followedTraders]);

  const toggleTraderNotification = useCallback((traderId: string) => {
    // TODO: Persist change via SocialController (socialAI.traderProfileIds)
    setTraderNotifications((prev) => ({
      ...prev,
      [traderId]: !prev[traderId],
    }));
  }, []);

  const handleSetEnabled = useCallback((value: boolean) => {
    // TODO: Persist change via SocialController (socialAI.enabled)
    setEnabled(value);
  }, []);

  const handleSetTxAmountLimit = useCallback((value: TxAmountThreshold) => {
    // TODO: Persist change via SocialController (socialAI.txAmountLimit)
    setTxAmountLimit(value);
  }, []);

  return {
    preferences: {
      enabled,
      txAmountLimit,
      traderNotifications,
    },
    setEnabled: handleSetEnabled,
    setTxAmountLimit: handleSetTxAmountLimit,
    toggleTraderNotification,
  };
};

export default useNotificationPreferences;
