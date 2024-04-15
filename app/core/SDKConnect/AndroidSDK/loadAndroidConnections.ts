import { RootState } from '../../../../app/reducers';
import { store } from '../../../../app/store';
import { ConnectionProps } from '../Connection';
import DevLogger from '../utils/DevLogger';

async function loadAndroidConnections(): Promise<{
  [id: string]: ConnectionProps;
}> {
  const { sdk } = store.getState() as RootState;

  const androidConnections = sdk.androidConnections || {};
  DevLogger.log(
    `SDKConnect::loadAndroidConnections found ${
      Object.keys(androidConnections).length
    }`,
    androidConnections,
  );
  return androidConnections;
}

export default loadAndroidConnections;
