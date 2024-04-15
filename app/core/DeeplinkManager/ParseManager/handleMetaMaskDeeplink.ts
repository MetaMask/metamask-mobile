import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';
import { Minimizer } from '../../NativeModules';
import SDKConnect from '../../SDKConnect/SDKConnect';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import Logger from '../../../util/Logger';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';

export function handleMetaMaskDeeplink({
  instance,
  handled,
  wcURL,
  origin,
  params,
  url,
}: {
  instance: DeeplinkManager;
  handled: () => void;
  wcURL: string;
  origin: string;
  params: ReturnType<typeof extractURLParams>['params'];
  url: string;
}) {
  handled();
  if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.ANDROID_SDK}`)) {
    DevLogger.log(
      `DeeplinkManager:: metamask launched via android sdk deeplink`,
    );
    SDKConnect.getInstance()
      .bindAndroidSDK()
      .catch((err) => {
        Logger.error(err, 'DeepLinkManager failed to connect');
      });
    return;
  }

  if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.CONNECT}`)) {
    if (params.redirect) {
      Minimizer.goBack();
    } else if (params.channelId) {
      handleDeeplink({
        channelId: params.channelId,
        origin,
        url,
        context: 'deeplink_scheme',
        otherPublicKey: params.pubkey,
        sdkConnect: SDKConnect.getInstance(),
      }).catch((err) => {
        Logger.error(err, 'DeepLinkManager failed to connect');
      });
    }
    return true;
  } else if (
    url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.WC}`) ||
    url.startsWith(`${PREFIXES.METAMASK}/${ACTIONS.WC}`)
  ) {
    // console.debug(`test now deeplink hack ${url}`);
    let fixedUrl = wcURL;
    if (url.startsWith(`${PREFIXES.METAMASK}/${ACTIONS.WC}`)) {
      fixedUrl = url.replace(
        `${PREFIXES.METAMASK}/${ACTIONS.WC}`,
        `${ACTIONS.WC}`,
      );
    } else {
      url.replace(`${PREFIXES.METAMASK}${ACTIONS.WC}`, `${ACTIONS.WC}`);
    }

    WC2Manager.getInstance()
      .then((WC2ManagerInstance) =>
        WC2ManagerInstance.connect({
          wcUri: fixedUrl,
          origin,
          redirectUrl: params?.redirect,
        }),
      )
      .catch((err) => {
        console.warn(`DeepLinkManager failed to connect`, err);
      });
  } else if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.BUY_CRYPTO}`)) {
    instance._handleBuyCrypto();
  } else if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}`)) {
    instance._handleSellCrypto();
  }
}

export default handleMetaMaskDeeplink;
