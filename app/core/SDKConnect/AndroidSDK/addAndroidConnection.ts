import { updateAndroidConnection } from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import { ConnectionProps } from '../Connection';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

async function addAndroidConnection(
  connection: ConnectionProps,
  instance: SDKConnect,
) {
  instance.state.androidConnections[connection.id] = connection;

  DevLogger.log(`SDKConnect::addAndroidConnection`, connection);

  store.dispatch(updateAndroidConnection(connection.id, connection));
}

export default addAndroidConnection;
