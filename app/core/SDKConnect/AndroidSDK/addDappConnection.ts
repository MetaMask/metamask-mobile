import { updateDappConnection } from '@actions/sdk';
import { store } from '@store/index';
import { ConnectionProps } from '@core/SDKConnect/Connection';
import SDKConnect from '@core/SDKConnect/SDKConnect';
import DevLogger from '@core/SDKConnect/utils/DevLogger';

async function addDappConnection(
  connection: ConnectionProps,
  instance: SDKConnect,
) {
  instance.state.dappConnections[connection.id] = connection;

  DevLogger.log(`SDKConnect::addDappConnection`, connection);

  store.dispatch(updateDappConnection(connection.id, connection));
}

export default addDappConnection;
