import AppConstants from '../../AppConstants';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware, {
  RPCMethodsMiddleParameters,
} from '../../RPCMethods/RPCMethodMiddleware';

import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import Logger from '../../../util/Logger';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import handleSendMessage from './handleSendMessage';
import { ImageSourcePropType } from 'react-native';
import { INTERNAL_ORIGINS } from '../../../constants/transaction';
import { rpcErrors } from '@metamask/rpc-errors';

/**
 * Sets up a BackgroundBridge for an SDK connection.
 *
 * IMPORTANT: `originatorInfo` is **self-reported** by the connecting dapp.
 * The `url`, `title`, and `icon` fields are NOT verified and MUST NOT be
 * treated as trusted identifiers. They are shown in the confirmation/approval
 * UI to indicate the claimed source of the request, and should therefore not
 * be treated as equivalent to a verified origin/hostname.
 */
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

  if (
    (originatorInfo.url && originatorInfo.url === ORIGIN_METAMASK) ||
    (originatorInfo.title && originatorInfo.title === ORIGIN_METAMASK)
  ) {
    throw new Error('Connections from metamask origin are not allowed');
  }

  // WARNING: originatorInfo.url is self-reported by the dapp and unverified.
  // It is shown in the confirmation/approval UI to indicate the claimed source
  // of the request. It should NOT be treated as equivalent to a verified
  // origin/hostname (e.g., browser-provided `sender.url` or WebView URL).
  const selfReportedUrl = originatorInfo.url;
  const selfReportedTitle = originatorInfo.title;
  const selfReportedIcon = originatorInfo.icon;

  const backgroundBridge = new BackgroundBridge({
    webview: null,
    isMMSDK: true,
    channelId: connection.channelId,
    url: selfReportedUrl,
    isRemoteConn: true,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        `getRpcMethodMiddleware origin=${connection.origin} selfReportedUrl=${selfReportedUrl} `,
      );
      // Prevent external connections from using internal origins
      // This is an external connection (SDK), so block any internal origin
      if (
        INTERNAL_ORIGINS.includes(selfReportedUrl) ||
        INTERNAL_ORIGINS.includes(selfReportedTitle)
      ) {
        throw rpcErrors.invalidParams({
          message: 'External transactions cannot use internal origins',
        });
      }
      return getRpcMethodMiddleware({
        hostname: connection.origin,
        channelId: connection.channelId,
        getProviderState,
        isMMSDK: true,
        navigation: null, //props.navigation,
        // Website info — self-reported by dapp, shown in confirmation/approval UI
        // to indicate the claimed source. Not equivalent to a verified origin.
        url: {
          current: selfReportedUrl,
        },
        title: {
          current: selfReportedTitle,
        },
        icon: { current: selfReportedIcon as ImageSourcePropType }, // TODO: Need to change the type at the @metamask/sdk-communication-layer from string to ImageSourcePropType
        tabId: '',
        isWalletConnect: false,
        analytics: {
          isRemoteConn: true,
          platform:
            originatorInfo?.platform ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
        },
      });
    },
    isMainFrame: true,
    isWalletConnect: false,
    wcRequestActions: undefined,
  });

  return backgroundBridge;
};

export default setupBridge;
