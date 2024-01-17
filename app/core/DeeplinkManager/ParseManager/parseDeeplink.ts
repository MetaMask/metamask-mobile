import { PROTOCOLS } from '../../../constants/deeplinks';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';
import Logger from '../../../util/Logger';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleDappUrl from './handleDappUrl';
import handleMetaMaskDeeplink from './handleMetaMaskDeeplink';
import handleUniversalLink from './handleUniversalLink';
import connectWithWC from './connectWithWC';

function parseDeeplink({
  deeplinkManager: instance,
  url,
  origin,
  browserCallBack,
  onHandled,
}: {
  deeplinkManager: DeeplinkManager;
  url: string;
  origin: string;
  browserCallBack?: (url: string) => void;
  onHandled?: () => void;
}) {
  const { urlObj, params } = extractURLParams(url);

  const sdkConnect = SDKConnect.getInstance();

  const protocol = urlObj.protocol.replace(':', '');
  DevLogger.log(
    `DeepLinkManager:parse sdkInit=${sdkConnect.hasInitialized()} origin=${origin} protocol=${protocol}`,
    url,
  );

  const handled = () => (onHandled ? onHandled() : false);

  const wcURL = params?.uri || urlObj.href;

  switch (urlObj.protocol.replace(':', '')) {
    case PROTOCOLS.HTTP:
    case PROTOCOLS.HTTPS:
      handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack,
        origin,
        wcURL,
        url,
      });

      break;
    case PROTOCOLS.WC:
      connectWithWC({ handled, wcURL, origin, params });
      break;

    case PROTOCOLS.ETHEREUM:
      handled();
      instance._handleEthereumUrl(url, origin).catch((err) => {
        Logger.error(err, 'Error handling ethereum url');
      });
      break;

    // Specific to the browser screen
    // For ex. navigate to a specific dapp
    case PROTOCOLS.DAPP:
      handleDappUrl({ instance, handled, urlObj, browserCallBack });
      break;

    // Specific to the MetaMask app
    // For ex. go to settings
    case PROTOCOLS.METAMASK:
      handleMetaMaskDeeplink({
        instance,
        handled,
        wcURL,
        origin,
        params,
        url,
      });
      break;
    default:
      return false;
  }

  return true;
}

export default parseDeeplink;
