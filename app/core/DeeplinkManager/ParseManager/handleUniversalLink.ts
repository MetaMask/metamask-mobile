import { ACTIONS, PREFIXES, PROTOCOLS } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import { Minimizer } from '../../NativeModules';
import SDKConnect from '../../SDKConnect/SDKConnect';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import Logger from '../../../util/Logger';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';

function handleUniversalLink({
  instance,
  handled,
  urlObj,
  params,
  browserCallBack,
  origin,
  wcURL,
  url,
}: {
  instance: DeeplinkManager;
  handled: () => void;
  urlObj: ReturnType<typeof extractURLParams>['urlObj'];
  params: ReturnType<typeof extractURLParams>['params'];
  browserCallBack?: (url: string) => void;
  origin: string;
  wcURL: string;
  url: string;
}) {
  const { MM_UNIVERSAL_LINK_HOST, MM_DEEP_ITMS_APP_LINK } = AppConstants;
  const DEEP_LINK_BASE = `${PROTOCOLS.HTTPS}://${MM_UNIVERSAL_LINK_HOST}`;

  // Universal links
  handled();

  if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
    // action is the first part of the pathname
    const action: ACTIONS = urlObj.pathname.split('/')[1] as ACTIONS;

    if (action === ACTIONS.ANDROID_SDK) {
      DevLogger.log(
        `DeeplinkManager:: metamask launched via android sdk universal link`,
      );
      SDKConnect.getInstance()
        .bindAndroidSDK()
        .catch((err) => {
          Logger.error(`DeepLinkManager failed to connect`, err);
        });
      return;
    }

    if (action === ACTIONS.CONNECT) {
      if (params.redirect) {
        Minimizer.goBack();
      } else if (params.channelId) {
        handleDeeplink({
          channelId: params.channelId,
          origin,
          context: 'deeplink_universal',
          url,
          otherPublicKey: params.pubkey,
          sdkConnect: SDKConnect.getInstance(),
        }).catch((err: unknown) => {
          Logger.error(`DeepLinkManager failed to connect`, err);
        });
      }
      return true;
    } else if (action === ACTIONS.WC && wcURL) {
      WC2Manager.getInstance()
        .then((WC2ManagerInstance) =>
          WC2ManagerInstance.connect({
            wcUri: wcURL,
            origin,
            redirectUrl: params?.redirect,
          }),
        )
        .catch((err) => {
          console.warn(`DeepLinkManager failed to connect`, err);
        });
      return;
    } else if (action === ACTIONS.WC) {
      // This is called from WC just to open the app and it's not supposed to do anything
      return;
    } else if (PREFIXES[action]) {
      const deeplinkUrl = urlObj.href.replace(
        `${DEEP_LINK_BASE}/${action}/`,
        PREFIXES[action],
      );
      // loops back to open the link with the right protocol
      instance.parse(deeplinkUrl, { browserCallBack, origin });
    } else if (action === ACTIONS.BUY_CRYPTO) {
      instance._handleBuyCrypto();
    } else if (action === ACTIONS.SELL_CRYPTO) {
      instance._handleSellCrypto();
    } else {
      // If it's our universal link or Apple store deep link don't open it in the browser
      if (
        (!action &&
          (urlObj.href === `${DEEP_LINK_BASE}/` ||
            urlObj.href === DEEP_LINK_BASE)) ||
        urlObj.href === MM_DEEP_ITMS_APP_LINK
      )
        return;

      // Fix for Apple Store redirect even when app is installed
      if (urlObj.href.startsWith(`${DEEP_LINK_BASE}/`)) {
        instance._handleBrowserUrl(
          `${PROTOCOLS.HTTPS}://${urlObj.href.replace(
            `${DEEP_LINK_BASE}/`,
            '',
          )}`,
          browserCallBack,
        );

        return;
      }

      // Normal links (same as dapp)
      instance._handleBrowserUrl(urlObj.href, browserCallBack);
    }
  } else {
    // Normal links (same as dapp)
    instance._handleBrowserUrl(urlObj.href, browserCallBack);
  }

  // walletconnect related deeplinks
  // address, transactions, etc
}

export default handleUniversalLink;
