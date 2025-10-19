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
 */
export function initializeDeeplinkServiceIfEnabled(): void {
  if (isUnifiedDeeplinkServiceEnabled()) {
    // Dynamic import to avoid loading the service if not needed
    import('./parseDeeplinkUnified').then(({ initializeDeeplinkService }) => {
      initializeDeeplinkService();
    });
  }
}
