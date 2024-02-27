import AppConstants from '../../AppConstants';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware, {
  RPCMethodsMiddleParameters,
} from '../../RPCMethods/RPCMethodMiddleware';

import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Logger from '../../../util/Logger';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import handleSendMessage from './handleSendMessage';

export const setupBridge = ({
  originatorInfo,
  connection,
}: {
  originatorInfo: OriginatorInfo;
  connection: Connection;
}): BackgroundBridge => {
  if (connection.backgroundBridge) {
    DevLogger.log(`setupBridge:: backgroundBridge already exists`);
    return connection.backgroundBridge;
  }

  const backgroundBridge = new BackgroundBridge({
    webview: null,
    isMMSDK: true,
    channelId: connection.channelId,
    url:
      PROTOCOLS.METAMASK + '://' + originatorInfo.url || originatorInfo.title,
    isRemoteConn: true,
    sendMessage: (msg: any) => {
      DevLogger.log(`setupBride::sendMessage`, msg);
      handleSendMessage({
        msg,
        connection,
      }).catch((err) => {
        Logger.error(err, 'Connection::sendMessage failed to send');
      });
    },
    getApprovedHosts: () => connection.getApprovedHosts('backgroundBridge'),
    remoteConnHost: connection.host,
    getRpcMethodMiddleware: ({
      getProviderState,
    }: RPCMethodsMiddleParameters) => {
      DevLogger.log(
        `getRpcMethodMiddleware hostname=${connection.host} url=${originatorInfo.url} `,
      );
      return getRpcMethodMiddleware({
        hostname: connection.host,
        channelId: connection.channelId,
        getProviderState,
        isMMSDK: true,
        navigation: null, //props.navigation,
        getApprovedHosts: () =>
          connection.getApprovedHosts('rpcMethodMiddleWare'),
        setApprovedHosts: (hostname: string) => {
          connection.approveHost({
            host: hostname,
            hostname,
            context: 'setApprovedHosts',
          });
        },
        approveHost: (approveHostname) =>
          connection.approveHost({
            host: connection.host,
            hostname: approveHostname,
            context: 'rpcMethodMiddleWare',
          }),
        // Website info
        url: {
          current: originatorInfo?.url,
        },
        title: {
          current: originatorInfo?.title,
        },
        icon: { current: undefined },
        // Bookmarks
        isHomepage: () => false,
        // Show autocomplete
        fromHomepage: { current: false },
        // Wizard
        wizardScrollAdjusted: { current: false },
        tabId: '',
        isWalletConnect: false,
        analytics: {
          isRemoteConn: true,
          platform:
            originatorInfo?.platform ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
        },
        toggleUrlModal: () => null,
        injectHomePageScripts: () => null,
      });
    },
    isMainFrame: true,
    isWalletConnect: false,
    wcRequestActions: undefined,
  });

  return backgroundBridge;
};

export default setupBridge;
