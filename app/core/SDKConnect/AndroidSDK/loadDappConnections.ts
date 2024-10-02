import { RootState } from '@reducers/index';
import { store } from '@store/index';
import { ConnectionProps } from '@core/SDKConnect/Connection';
import DevLogger from '@core/SDKConnect/utils/DevLogger';

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
