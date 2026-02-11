import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../Logger';
import { OPTIN_META_METRICS_UI_SEEN, TRUE } from '../../constants/storage';

/**
 * Marks the metrics opt-in UI as seen.
 * This flag indicates the user has been presented with (or bypassed) the metrics consent screen.
 *
 * Used by:
 * - OptinMetrics: After user makes an explicit choice on the consent screen
 * - Onboarding (OAuth): When user authenticates via social login (auto-consents to metrics)
 *
 * @returns Promise<boolean> - true if successful, false if storage operation failed
 */
export async function markMetricsOptInUISeen(): Promise<boolean> {
  try {
    await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, TRUE);
    return true;
  } catch (error) {
    Logger.error(error as Error, 'Failed to mark metrics opt-in UI as seen');
    return false;
  }
}

/**
 * Resets the metrics opt-in UI seen flag.
 * This ensures the user will see the consent screen again when starting a new wallet flow.
 *
 * Used by:
 * - Onboarding: When user starts "Create Wallet" or "Import Wallet" flow
 * to ensure they make a fresh metrics consent choice
 *
 * @returns Promise<boolean> - true if successful, false if storage operation failed
 */
export async function resetMetricsOptInUISeen(): Promise<boolean> {
  try {
    await StorageWrapper.removeItem(OPTIN_META_METRICS_UI_SEEN);
    return true;
  } catch (error) {
    Logger.error(error as Error, 'Failed to reset metrics opt-in UI seen flag');
    return false;
  }
}
