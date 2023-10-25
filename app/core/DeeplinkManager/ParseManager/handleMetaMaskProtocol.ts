import { DeeplinkManager } from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';
import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';
import SDKConnect, {
  DEFAULT_SESSION_TIMEOUT_MS,
} from '../../../core/SDKConnect/SDKConnect';
import { Minimizer } from '../../../core/NativeModules';
import AppConstants from '../../../core/AppConstants';

export function handleMetaMaskProtocol({
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
    SDKConnect.getInstance().bindAndroidSDK();
    return;
  }

  if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.CONNECT}`)) {
    if (params.redirect) {
      Minimizer.goBack();
    } else if (params.channelId) {
      const channelExists =
        SDKConnect.getInstance().getApprovedHosts()[params.channelId];

      if (channelExists) {
        if (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
          // Automatically re-approve hosts.
          SDKConnect.getInstance().revalidateChannel({
            channelId: params.channelId,
          });
        }
        SDKConnect.getInstance().reconnect({
          channelId: params.channelId,
          otherPublicKey: params.pubkey,
          context: 'deeplink (metamask)',
          initialConnection: false,
        });
      } else {
        SDKConnect.getInstance().connectToChannel({
          id: params.channelId,
          origin,
          otherPublicKey: params.pubkey,
          validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
        });
      }
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
  }
}

export default handleMetaMaskProtocol;
