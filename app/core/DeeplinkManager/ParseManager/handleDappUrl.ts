import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';

export function handleDappUrl({
  instance,
  handled,
  urlObj,
  browserCallBack,
}: {
  instance: DeeplinkManager;
  handled: () => void;
  urlObj: ReturnType<typeof extractURLParams>['urlObj'];
  browserCallBack?: (url: string) => void;
}) {
  // Enforce https
  handled();
  urlObj.set('protocol', 'https:');
  instance._handleBrowserUrl(urlObj.href, browserCallBack);
}

export default handleDappUrl;
