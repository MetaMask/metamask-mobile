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
  verifyDeeplinkSignature,
  hasSignature,
  VALID,
  INVALID,
  MISSING,
} from './utils/verifySignature';
import NavigationService from '../../../core/NavigationService';
import Routes from '../../../constants/navigation/Routes';
import { ACTIONS } from '../../../constants/deeplinks';

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
    // Validate URL format before creating URL object
    if (!url || !url.includes('://') || url.split('://')[1].length === 0) {
      throw new Error('Invalid URL format');
    }
    const validatedUrl = new URL(url);

    if (
      !validatedUrl.hostname ||
      validatedUrl.hostname.includes('?') ||
      validatedUrl.hostname.includes('&')
    ) {
      throw new Error('Invalid hostname');
    }

    let isPrivateLink = false;
    let isInvalidLink = false;

    const pathname: ACTIONS = validatedUrl.pathname.split('/')[1] as ACTIONS;
    if (!Object.keys(ACTIONS).includes(pathname.toUpperCase())) {
      isInvalidLink = true;
    }

    if (hasSignature(validatedUrl)) {
      const signatureResult = await verifyDeeplinkSignature(validatedUrl);
      switch (signatureResult) {
        case VALID:
          DevLogger.log(
            'DeepLinkManager:parse Verified signature for deeplink',
            url,
          );
          isPrivateLink = true;
          break;
        case INVALID:
        case MISSING:
          DevLogger.log(
            'DeepLinkManager:parse Invalid/Missing signature, ignoring deeplink',
            url,
          );
          isPrivateLink = false;
          break;
        default:
          isPrivateLink = false;
          break;
      }
    }

    const { urlObj, params } = extractURLParams(url);

    const shouldProceed = await new Promise<boolean>((resolve) => {
      const pageTitle: ACTIONS = urlObj.pathname.split('/')[1] as ACTIONS;
      NavigationService.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.DEEP_LINK_MODAL,
        params: {
          linkType: isInvalidLink
            ? 'invalid'
            : isPrivateLink
            ? 'private'
            : 'public',
          pageTitle: pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1),
          onContinue: () => resolve(true),
          onBack: () => resolve(false),
        },
      });
    });

    if (!shouldProceed) {
      return false;
    }

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
