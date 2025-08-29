import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';
import SDKConnect from '../../SDKConnect/SDKConnect';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import parseOriginatorInfo from '../parseOriginatorInfo';
import extractURLParams from './extractURLParams';
import SDKConnectV2 from '../../SDKConnectV2';
import { handleBuyCrypto } from '../Handlers/handleBuyCrypto';
import { handleSellCrypto } from '../Handlers/handleSellCrypto';

export function handleMetaMaskDeeplink({
  handled,
  wcURL,
  origin,
  params,
  url,
}: {
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

  if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.CONNECT}/mwp`)) {
    DevLogger.log(
      `DeeplinkManager:: Mobile Wallet Protocol deeplink detected. Routing to SDKConnectV2.`,
      url,
    );
    SDKConnectV2.handleConnectDeeplink(url);
    return;
  }

  if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.CONNECT}`)) {
    if (params.redirect && origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
      SDKConnect.getInstance().state.navigation?.navigate(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
        },
      );
    } else if (params.channelId) {
      // differentiate between  deeplink callback and socket connection
      if (params.comm === 'deeplinking') {
        if (!params.scheme) {
          throw new Error(`DeepLinkManager failed to connect - Invalid scheme`);
        }

        SDKConnect.getInstance().state.deeplinkingService?.handleConnection({
          channelId: params.channelId,
          url,
          scheme: params.scheme ?? '',
          dappPublicKey: params.pubkey,
          originatorInfo: params.originatorInfo,
          request: params.request,
        });
      } else {
        const protocolVersion = parseInt(params.v ?? '1', 10);

        DevLogger.log(
          `handleMetaMaskDeeplink:: deeplink_scheme typeof(protocolVersion)=${typeof protocolVersion} protocolVersion=${protocolVersion} v=${
            params.v
          }`,
        );

        let originatorInfo: OriginatorInfo | undefined;
        if (params.originatorInfo) {
          originatorInfo = parseOriginatorInfo({
            base64OriginatorInfo: params.originatorInfo,
          });
        }
        handleDeeplink({
          channelId: params.channelId,
          origin,
          url,
          protocolVersion,
          context: 'deeplink_scheme',
          originatorInfo,
          rpc: params.rpc,
          otherPublicKey: params.pubkey,
          sdkConnect: SDKConnect.getInstance(),
        }).catch((err) => {
          Logger.error(err, 'DeepLinkManager failed to connect');
        });
      }
    }
    return true;
  } else if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.MMSDK}`)) {
    if (!params.message) {
      throw new Error(
        `DeepLinkManager: deeplinkingService failed to handleMessage - Invalid message`,
      );
    }

    if (!params.scheme) {
      throw new Error(
        `DeepLinkManager: deeplinkingService failed to handleMessage - Invalid scheme`,
      );
    }

    SDKConnect.getInstance().state.deeplinkingService?.handleMessage({
      channelId: params.channelId,
      url,
      message: params.message,
      dappPublicKey: params.pubkey,
      scheme: params.scheme,
      account: params.account ?? '@',
    });
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
  } else if (
    url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.BUY_CRYPTO}`) ||
    url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.BUY}`)
  ) {
    const rampPath = url
      .replace(`${PREFIXES.METAMASK}${ACTIONS.BUY_CRYPTO}`, '')
      .replace(`${PREFIXES.METAMASK}${ACTIONS.BUY}`, '');
    handleBuyCrypto(rampPath);
  } else if (
    url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}`) ||
    url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.SELL}`)
  ) {
    const rampPath = url
      .replace(`${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}`, '')
      .replace(`${PREFIXES.METAMASK}${ACTIONS.SELL}`, '');
    handleSellCrypto(rampPath);
  }
}

export default handleMetaMaskDeeplink;
