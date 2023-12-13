import AppConstants from '../../../core/AppConstants';
import { ConnectionProps } from '../Connection';
import DefaultPreference from 'react-native-default-preference';
import DevLogger from '../utils/DevLogger';

async function loadAndroidConnections(): Promise<{
  [id: string]: ConnectionProps;
}> {
  const rawConnections = await DefaultPreference.get(
    AppConstants.MM_SDK.ANDROID_CONNECTIONS,
  );

  if (!rawConnections) return {};

  const parsed = JSON.parse(rawConnections);
  DevLogger.log(
    `SDKConnect::loadAndroidConnections found ${Object.keys(parsed).length}`,
  );
  return parsed;
}

export default loadAndroidConnections;
