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
import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import {
  verifyDeeplinkWithLogging,
  hasSignature,
  VALID,
  INVALID,
  MISSING,
} from './utils/verifySignature';

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
    // Check and verify signature if present
    if (hasSignature(validatedUrl)) {
      // TODO: handle the UI flow for signature verification states
      const signatureResult = await verifyDeeplinkWithLogging(
        validatedUrl,
        origin,
      );

      if (signatureResult === INVALID) {
        DevLogger.log(
          'DeepLinkManager:parse Invalid signature, ignoring deeplink',
          url,
        );
        return false;
      }

      if (signatureResult === VALID) {
        DevLogger.log(
          'DeepLinkManager:parse Valid signature verified for deeplink',
          url,
        );
      } else if (signatureResult === MISSING) {
        DevLogger.log(
          'DeepLinkManager:parse No signature found in deeplink',
          url,
        );
      }
    }

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
  } catch (error) {
    const isPrivateKey = url.length === 64;
    if (error && !isPrivateKey) {
      Logger.log('DeepLinkManager:parse error parsing deeplink');
      if (origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) {
        Alert.alert(
          strings('qr_scanner.unrecognized_address_qr_code_title'),
          strings('qr_scanner.unrecognized_address_qr_code_desc'),
        );
      } else {
        Alert.alert(strings('deeplink.invalid'), `Invalid URL: ${url}`);
      }
    }

    return false;
  }
}

export default parseDeeplink;
