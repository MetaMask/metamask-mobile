import extractURLParams from '../../utils/extractURLParams';
import { ACTIONS, PREFIXES } from '../../../../constants/deeplinks';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import handleBrowserUrl, {
  createBrowserDeeplinkIntent,
} from './handleBrowserUrl';

export const getDappUrl = (
  urlObj: ReturnType<typeof extractURLParams>['urlObj'],
) => {
  urlObj.set('protocol', 'https:');
  return urlObj.href;
};

export const getDappUrlFromUniversalLink = ({
  baseUrlAction,
  urlObj,
}: {
  baseUrlAction: string;
  urlObj: ReturnType<typeof extractURLParams>['urlObj'];
}) => {
  // Extract everything after /dapp/ from the URL.
  // The path can contain either a bare domain (example.com/path)
  // or a full URL with protocol (https://example.com/path).
  // When a full URL is embedded, url-parse may normalize the double
  // slash (https://...app.link/dapp/https://x.com -> .../dapp/https:/x.com),
  // so we check for both http:// and http:/ patterns.
  const pathAfterAction = urlObj.href.replace(`${baseUrlAction}/`, '');

  if (!pathAfterAction) {
    return null;
  }

  const hasProtocol = /^https?:\/\/?/.test(pathAfterAction);
  return hasProtocol
    ? pathAfterAction.replace(/^(https?:\/)([^/])/, '$1/$2')
    : `${PREFIXES[ACTIONS.DAPP]}${pathAfterAction}`;
};

export const createDappDeeplinkIntent = ({
  url,
}: {
  url: string;
}): DeeplinkIntent => createBrowserDeeplinkIntent({ url });

export function handleDappUrl({
  handled,
  urlObj,
  browserCallBack,
}: {
  handled: () => void;
  urlObj: ReturnType<typeof extractURLParams>['urlObj'];
  browserCallBack?: (url: string) => void;
}) {
  // Enforce https
  handled();
  handleBrowserUrl({
    url: getDappUrl(urlObj),
    callback: browserCallBack,
  });
}
