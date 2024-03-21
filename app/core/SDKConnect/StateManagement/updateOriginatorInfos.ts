import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { resetConnections } from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

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

  // update originatorInfo
  instance.state.connections[channelId] = {
    ...instance.state.connections[channelId],
    originatorInfo,
    connected: true,
  };

  DevLogger.log(
    `SDKConnect::updateOriginatorInfos`,
    instance.state.connections,
  );
  store.dispatch(resetConnections(instance.state.connections));
}

export default updateOriginatorInfos;
