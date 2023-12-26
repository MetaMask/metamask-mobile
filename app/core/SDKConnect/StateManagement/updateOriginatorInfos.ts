import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import SDKConnect from '../SDKConnect';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../AppConstants';

function updateOriginatorInfos({
  channelId,
  originatorInfo,
  instance,
}: {
  channelId: string;
  originatorInfo: OriginatorInfo;
  instance: SDKConnect;
}) {
  if (!instance.state.connections[channelId]) {
    console.warn(`SDKConnect::updateOriginatorInfos - no connection`);
    return;
  }

  instance.state.connections[channelId].originatorInfo = originatorInfo;
  DefaultPreference.set(
    AppConstants.MM_SDK.SDK_CONNECTIONS,
    JSON.stringify(instance.state.connections),
  ).catch((err) => {
    throw err;
  });
  instance.emit('refresh');
}

export default updateOriginatorInfos;
