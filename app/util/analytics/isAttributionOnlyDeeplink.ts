import { ACTIONS, PROTOCOLS } from '../../constants/deeplinks';
import extractURLParams from '../../core/DeeplinkManager/utils/extractURLParams';
import { isSDKServiceDeeplink } from '../../core/DeeplinkManager/util/deeplinks';
import { attributionPayloadFromDeeplink } from '../../core/redux/slices/attributionFromSources';

/**
 * First path segment (universal link) or hostname (metamask://) used for routing.
 */
export function getDeeplinkNavigationAction(deeplinkUrl: string): string {
  const { urlObj } = extractURLParams(deeplinkUrl);
  const protocol = urlObj.protocol.replace(':', '');

  if (protocol === PROTOCOLS.METAMASK) {
    return urlObj.hostname ?? '';
  }

  if (protocol === PROTOCOLS.HTTP || protocol === PROTOCOLS.HTTPS) {
    return urlObj.pathname.split('/').filter(Boolean)[0] ?? '';
  }

  return '';
}

/**
 * True when the URL carries acquisition params but has no deferred navigation
 * target beyond home/root (e.g. install UTM links). Navigation deeplinks such as
 * rewards or perps return false even when they include UTM query params.
 */
export function isAttributionOnlyDeeplink(deeplinkUrl: string): boolean {
  if (!attributionPayloadFromDeeplink(deeplinkUrl)) {
    return false;
  }

  if (isSDKServiceDeeplink(deeplinkUrl)) {
    return false;
  }

  const action = getDeeplinkNavigationAction(deeplinkUrl);
  return action === '' || action === ACTIONS.HOME;
}
