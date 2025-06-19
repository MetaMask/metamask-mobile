import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { ACTIONS, PREFIXES, PROTOCOLS } from '../../../constants/deeplinks';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';
import SDKConnect from '../../SDKConnect/SDKConnect';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import DeeplinkManager from '../DeeplinkManager';
import parseOriginatorInfo from '../parseOriginatorInfo';
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
  const {
    MM_UNIVERSAL_LINK_HOST,
    MM_DEEP_ITMS_APP_LINK,
    MM_IO_UNIVERSAL_LINK_HOST,
    MM_IO_UNIVERSAL_LINK_TEST_HOST,
  } = AppConstants;
  const DEEP_LINK_BASE = `${PROTOCOLS.HTTPS}://${MM_UNIVERSAL_LINK_HOST}`;

  // Universal links
  handled();

  // action is the first part of the pathname
  const action: ACTIONS = urlObj.pathname.split('/')[1] as ACTIONS;

  if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
    if (action === ACTIONS.ANDROID_SDK) {
      DevLogger.log(
        `DeeplinkManager:: metamask launched via android sdk universal link`,
      );
      SDKConnect.getInstance()
        .bindAndroidSDK()
        .catch((err) => {
          Logger.error(err, `DeepLinkManager failed to connect`);
        });
      return;
    }

    if (action === ACTIONS.CONNECT) {
      if (params.redirect && origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
        SDKConnect.getInstance().state.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
        });
      } else if (params.channelId) {
        const protocolVersion = parseInt(params.v ?? '1', 10);

        DevLogger.log(
          `handleUniversalLink:: deeplink_scheme protocolVersion=${protocolVersion} v=${params.v}`,
        );

        let originatorInfo: OriginatorInfo | undefined;
        if (params.originatorInfo) {
          originatorInfo = parseOriginatorInfo({
            base64OriginatorInfo: params.originatorInfo,
          });
        }

        handleDeeplink({
          protocolVersion,
          channelId: params.channelId,
          origin,
          context: 'deeplink_universal',
          url,
          rpc: params.rpc,
          originatorInfo,
          otherPublicKey: params.pubkey,
          sdkConnect: SDKConnect.getInstance(),
        }).catch((err: unknown) => {
          Logger.error(err as Error, `DeepLinkManager failed to connect`);
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
    } else if (PREFIXES[action as keyof typeof PREFIXES]) {
      const deeplinkUrl = urlObj.href.replace(
        `${DEEP_LINK_BASE}/${action}/`,
        PREFIXES[action as keyof typeof PREFIXES],
      );
      // loops back to open the link with the right protocol
      instance.parse(deeplinkUrl, { browserCallBack, origin });
    } else if (action === ACTIONS.BUY_CRYPTO || action === ACTIONS.BUY) {
      const rampPath = urlObj.href
        .replace(`${DEEP_LINK_BASE}/${ACTIONS.BUY_CRYPTO}`, '')
        .replace(`${DEEP_LINK_BASE}/${ACTIONS.BUY}`, '');
      instance._handleBuyCrypto(rampPath);
    } else if (action === ACTIONS.SELL_CRYPTO || action === ACTIONS.SELL) {
      const rampPath = urlObj.href
        .replace(`${DEEP_LINK_BASE}/${ACTIONS.SELL_CRYPTO}`, '')
        .replace(`${DEEP_LINK_BASE}/${ACTIONS.SELL}`, '');
      instance._handleSellCrypto(rampPath);
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
  } else if (urlObj.hostname === MM_IO_UNIVERSAL_LINK_HOST || urlObj.hostname === MM_IO_UNIVERSAL_LINK_TEST_HOST) {
    // TODO: handle private links with signature verification https://github.com/MetaMask/metamask-mobile/issues/16040
    // TODO: add interstitial modal for public links https://github.com/MetaMask/metamask-mobile/issues/15491
    switch (action) {
      case ACTIONS.HOME:
        instance._handleOpenHome();
        return;
      case ACTIONS.SWAP: {
        // TODO: perhaps update this when the new bridging UI is implemented
        // Expecting to only be a navigation change
        const swapPath = urlObj.href.replace(
          `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${ACTIONS.SWAP}`,
          '',
        );
        instance._handleSwap(swapPath);
        return;
      }
      case ACTIONS.BUY:
      case ACTIONS.BUY_CRYPTO: {
        const rampPath = urlObj.href
          .replace(
            `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${ACTIONS.BUY_CRYPTO}`,
            '',
          )
          .replace(
            `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${ACTIONS.BUY}`,
            '',
          );
        instance._handleBuyCrypto(rampPath);
        return;
      }
      default:
        instance._handleOpenHome();
        return;
    }
  } else {
    // Normal links (same as dapp)
    instance._handleBrowserUrl(urlObj.href, browserCallBack);
  }

  // walletconnect related deeplinks
  // address, transactions, etc
}

export default handleUniversalLink;
