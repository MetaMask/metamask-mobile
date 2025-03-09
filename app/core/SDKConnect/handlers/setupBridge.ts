import AppConstants from '../../AppConstants';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';

import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Logger from '../../../util/Logger';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import handleSendMessage from './handleSendMessage';
import { ImageSourcePropType } from 'react-native';
import RemotePort from '../../BackgroundBridge/RemotePort';

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
    url: `${PROTOCOLS.METAMASK}://${connection.channelId}`,
    isMMSDK: true,
    port: new RemotePort(
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (msg: any) => {
        DevLogger.log(`setupBride::sendMessage`, msg);
        handleSendMessage({
          msg,
          connection,
        }).catch((err) => {
          Logger.error(err, 'Connection::sendMessage failed to send');
        });
      },
    ),
    getRpcMethodMiddleware: ({ getProviderState, getSubjectInfo }) => {
      DevLogger.log(
        `getRpcMethodMiddleware hostname=${connection.host} url=${originatorInfo.url} `,
      );
      return getRpcMethodMiddleware({
        getProviderState,
        getSubjectInfo,
        navigation: null, //props.navigation,
        // Website info
        subjectDisplayInfo: {
          title: originatorInfo?.title,
          // TODO: Need to change the type at the @metamask/sdk-communication-layer from string to ImageSourcePropType
          icon: originatorInfo?.icon as ImageSourcePropType,
        },
        // Bookmarks
        isHomepage: () => false,
        // Show autocomplete
        fromHomepage: { current: false },
        // Wizard
        wizardScrollAdjusted: { current: false },
        tabId: '',
        analytics: {
          platform:
            originatorInfo?.platform ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
        },
        toggleUrlModal: () => null,
        injectHomePageScripts: () => null,
      });
    },
  });

  return backgroundBridge;
};

export default setupBridge;
