import type { Dispatch } from 'redux';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { saveAttribution } from '../../core/redux/slices/attribution';
import { attributionPayloadFromDeeplink } from '../../core/redux/slices/attributionFromSources';

/**
 * Persists acquisition params from the install / pending deeplink when marketing
 * consent is granted after the link was first opened.
 *
 * @returns true when attribution was saved to Redux.
 */
export function persistAttributionFromPendingDeeplink(
  dispatch: Dispatch,
): boolean {
  const deeplink =
    AppStateEventProcessor.pendingDeeplink ??
    AppStateEventProcessor.currentDeeplink;

  if (!deeplink) {
    return false;
  }

  const payload = attributionPayloadFromDeeplink(deeplink);
  if (!payload) {
    return false;
  }

  dispatch(saveAttribution(payload));

  return true;
}
