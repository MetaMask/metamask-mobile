import { PROTOCOLS } from '../../constants/deeplinks';
import SDKConnect from '../SDKConnect/SDKConnect';
import Logger from '../../util/Logger';
import DevLogger from '../SDKConnect/utils/DevLogger';
import DeeplinkManager from './DeeplinkManager';
import extractURLParams from './utils/extractURLParams';
import handleDappUrl from './handlers/legacy/handleDappUrl';
import handleUniversalLink from './handlers/legacy/handleUniversalLink';
import connectWithWC from './handlers/legacy/connectWithWC';
import { Alert } from 'react-native';
import { strings } from '../../../locales/i18n';
import AppConstants from '../AppConstants';
import handleEthereumUrl from './handlers/legacy/handleEthereumUrl';

async function parseDeeplink({
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
  try {
    const validatedUrl = new URL(url);
    DevLogger.log('DeepLinkManager:parse validatedUrl', validatedUrl);

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
      /* eslint-disable no-fallthrough */
      case PROTOCOLS.METAMASK:
      case PROTOCOLS.HTTP:
      case PROTOCOLS.HTTPS: {
        // Attempts to replace the metamask protocol with the https protocol so that it is compatible with handleUniversalLink
        const mappedUrl = url.replace(
          `${PROTOCOLS.METAMASK}://`,
          `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/`,
        );
        const { urlObj: mappedUrlObj } = extractURLParams(mappedUrl);
        handleUniversalLink({
          instance,
          handled,
          urlObj: mappedUrlObj,
          browserCallBack,
          url: mappedUrl,
          source: origin,
        });
        break;
      }
      case PROTOCOLS.WC:
        connectWithWC({ handled, wcURL, origin, params });
        break;
      case PROTOCOLS.ETHEREUM:
        handled();
        handleEthereumUrl({
          deeplinkManager: instance,
          url,
          origin,
        }).catch((err) => {
          Logger.error(err, 'Error handling ethereum url');
        });
        break;
      // Specific to the browser screen
      // For ex. navigate to a specific dapp
      case PROTOCOLS.DAPP:
        handleDappUrl({ instance, handled, urlObj, browserCallBack });
        break;
      default:
        return false;
    }

    return true;
  } catch (error) {
    const isPrivateKey = url.length === 64;
    if (error && !isPrivateKey) {
      Logger.log('DeepLinkManager:parse error parsing deeplink');
      if (origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) {
        // Navigate back first, then show alert
        onHandled?.();
        Alert.alert(
          strings('qr_scanner.unrecognized_address_qr_code_title'),
          strings('qr_scanner.unrecognized_address_qr_code_desc'),
        );

        // Return true to indicate we handled this
        return true;
      }
      Alert.alert(strings('deeplink.invalid'), `Invalid URL: ${url}`);
    }

    return false;
  }
}

export default parseDeeplink;
