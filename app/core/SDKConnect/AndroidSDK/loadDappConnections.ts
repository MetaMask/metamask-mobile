import { RootState } from '../../../reducers';
import { store } from '../../../store';
import { ConnectionProps } from '../Connection';
import DevLogger from '../utils/DevLogger';

async function loadDappConnections(): Promise<{
  [id: string]: ConnectionProps;
}> {
  const { sdk } = store.getState() as RootState;

  const dappConnections = sdk.dappConnections || {};
  DevLogger.log(
    `SDKConnect::loadDappConnections found ${
      Object.keys(dappConnections).length
    }`,
    dappConnections,
  );
  return dappConnections;
}

export default loadDappConnections;
