import type { Dispatch } from 'redux';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { isAttributionOnlyDeeplink } from './isAttributionOnlyDeeplink';

/**
 * Clears persisted acquisition data and attribution-only install deeplinks after
 * Wallet Setup Completed enrichment (or once the opt-in decision is recorded).
 */
export function clearAcquisitionStateAfterOptIn(dispatch: Dispatch): void {
  dispatch(clearAttribution());

  const pendingDeeplink = AppStateEventProcessor.pendingDeeplink;
  if (pendingDeeplink && isAttributionOnlyDeeplink(pendingDeeplink)) {
    AppStateEventProcessor.clearPendingDeeplink();
  }
}
