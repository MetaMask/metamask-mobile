import extractURLParams from './extractURLParams';
import handleBrowserUrl from '../Handlers/handleBrowserUrl';

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
  urlObj.set('protocol', 'https:');
  handleBrowserUrl({
    url: urlObj.href,
    callback: browserCallBack,
  });
}

export default handleDappUrl;
