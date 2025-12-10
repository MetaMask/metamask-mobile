import DeeplinkManager from '../../DeeplinkManager';
import extractURLParams from '../../utils/extractURLParams';
import handleBrowserUrl from './handleBrowserUrl';

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
  handleBrowserUrl({
    deeplinkManager: instance,
    url: urlObj.href,
    callback: browserCallBack,
  });
}

export default handleDappUrl;
