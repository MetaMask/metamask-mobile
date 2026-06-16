import type { Dispatch } from 'redux';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { saveAttribution } from '../../core/redux/slices/attribution';
import { attributionPayloadFromDeeplink } from '../../core/redux/slices/attributionFromSources';

/**
 * Parses UTM / acquisition params from a deeplink URL.
 */
export function getUtmAttributesFromDeeplinkUrl(
  deeplinkUrl: string,
): ReturnType<typeof attributionPayloadFromDeeplink> {
  return attributionPayloadFromDeeplink(deeplinkUrl);
}

/**
 * Persists UTM / acquisition params from a deeplink URL into Redux attribution state.
 *
 * @returns true when attribution was saved to Redux.
 */
export function persistUtmAttributes(
  deeplinkUrl: string,
  dispatch: Dispatch,
): boolean {
  const payload = getUtmAttributesFromDeeplinkUrl(deeplinkUrl);
  if (!payload) {
    return false;
  }

  dispatch(saveAttribution(payload));

  return true;
}

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

  return persistUtmAttributes(deeplink, dispatch);
}
