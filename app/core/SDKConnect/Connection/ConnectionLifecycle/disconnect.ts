import { MessageType } from '@metamask/sdk-communication-layer';
import { removeOriginProvenance } from '../../../OriginProvenance';
import DevLogger from '../../utils/DevLogger';
import { Connection } from '../Connection';

async function disconnect({
  terminate,
  context,
  instance,
}: {
  instance: Connection;
  terminate: boolean;
  context?: string;
}): Promise<boolean> {
  DevLogger.log(
    `Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate}`,
  );
  instance.receivedClientsReady = false;
  let terminated = false;
  if (terminate) {
    DevLogger.log(
      `Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate} sending terminate`,
    );
    terminated = await instance.remote.sendMessage({
      type: MessageType.TERMINATE,
    });
    DevLogger.log(
      `Connection::disconnect() context=${context} id=${instance.channelId} terminate=${terminate} sent terminate=${terminated}`,
    );
  }
  if (terminated) {
    instance.remote.disconnect();
    // The connection is permanently closed: drop the provenance stamped in
    // setupBridge (mirrors WalletConnect2Session.removeListeners and
    // RPCBridgeAdapter.dispose). Non-terminal disconnects keep the stamp
    // because the connection can resume.
    removeOriginProvenance(instance.channelId);
  }
  return terminated;
}

export default disconnect;
