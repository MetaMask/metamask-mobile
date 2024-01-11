import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { Platform } from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import Device from '../../../../util/device';
import Engine from '../../../Engine';
import { Minimizer } from '../../../NativeModules';
import { approveHostProps } from '../../SDKConnect';
import handleConnectionReady from '../../handlers/handleConnectionReady';
import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

function handleClientsReady({
  instance,
  disapprove,
  updateOriginatorInfos,
  approveHost,
}: {
  instance: Connection;
  disapprove: (channelId: string) => void;
  updateOriginatorInfos: (params: {
    channelId: string;
    originatorInfo: OriginatorInfo;
  }) => void;
  approveHost: (props: approveHostProps) => void;
}) {
  return async (clientsReadyMsg: { originatorInfo: OriginatorInfo }) => {
    try {
      await handleConnectionReady({
        originatorInfo: clientsReadyMsg.originatorInfo,
        engine: Engine,
        updateOriginatorInfos,
        approveHost,
        onError: (error) => {
          Logger.error(error, '');
          // Redirect on deeplinks
          if (instance.trigger === 'deeplink') {
            // Check for iOS 17 and above to use a custom modal, as Minimizer.goBack() is incompatible with these versions
            if (Device.isIos() && parseInt(Platform.Version as string) >= 17) {
              instance.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
              });
            } else {
              Minimizer.goBack();
            }
          }
        },
        disapprove,
        connection: instance,
      });
    } catch (error) {
      DevLogger.log(`Connection::CLIENTS_READY error`, error);
      // Send error message to user
    }
  };
}

export default handleClientsReady;
