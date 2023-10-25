import { PROTOCOLS } from '../../../constants/deeplinks';
import Logger from '../../../util/Logger';
import { DeeplinkManager } from '../DeeplinkManager';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import extractURLParams from './extractURLParams';
import handleDappProtocol from './handleDappProtocol';
import handleMetaMaskProtocol from './handleMetaMaskProtocol';
import handleUniversalLinks from './handleUniversalLinks';
import handleWCProtocol from './handleWCProtocol';

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
  browserCallBack: (url: string) => void;
  onHandled?: () => void;
}) {
  const { urlObj, params } = extractURLParams(url);

  // Double log entry because the Logger is too slow and display the message in incorrect order.
  Logger.log(`DeepLinkManager: parsing url=${url} origin=${origin}`);
  DevLogger.log(`DeepLinkManager: parsing url=${url} origin=${origin}`);

  const handled = () => (onHandled ? onHandled() : false);

  const wcURL = params?.uri || urlObj.href;

  switch (urlObj.protocol.replace(':', '')) {
    case PROTOCOLS.HTTP:
    case PROTOCOLS.HTTPS:
      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack,
        origin,
        wcURL,
      });

      break;
    case PROTOCOLS.WC:
      handleWCProtocol({ handled, wcURL, origin, params });
      break;

    case PROTOCOLS.ETHEREUM:
      handled();
      instance._handleEthereumUrl(url, origin);
      break;

    // Specific to the browser screen
    // For ex. navigate to a specific dapp
    case PROTOCOLS.DAPP:
      handleDappProtocol({ instance, handled, urlObj, browserCallBack });
      break;

    // Specific to the MetaMask app
    // For ex. go to settings
    case PROTOCOLS.METAMASK:
      handleMetaMaskProtocol({ instance, handled, wcURL, origin, params, url });
      break;
    default:
      return false;
  }

  return true;
}

export default parseDeeplink;
