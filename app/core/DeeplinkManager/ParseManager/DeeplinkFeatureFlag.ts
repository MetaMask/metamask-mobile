import { store } from '../../../store';
import { selectUnifiedDeeplinksEnabled } from '../../../selectors/featureFlagController/unifiedDeeplinks';

/**
 * Check if the unified deeplink service is enabled
 * This can be called from non-React contexts
 */
export function isUnifiedDeeplinkServiceEnabled(): boolean {
  const state = store.getState();
  return selectUnifiedDeeplinksEnabled(state);
}

/**
 * Initialize the unified deeplink service if enabled
 * This should be called once during app initialization
 * NOTE: This function will be functional once parseDeeplinkUnified is added in a later PR
 */
export async function initializeDeeplinkServiceIfEnabled(): Promise<void> {
  if (isUnifiedDeeplinkServiceEnabled()) {
    // TODO: The actual implementation will be added when parseDeeplinkUnified is available
    // For now, this is a placeholder that checks the feature flag
    // The dynamic import and initialization will be added in a future PR
    return Promise.resolve();
  }
}
