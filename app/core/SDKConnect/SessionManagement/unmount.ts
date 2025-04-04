import BackgroundTimer from 'react-native-background-timer';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import SDKConnect from '../SDKConnect';

async function unmount(instance: SDKConnect) {
  Logger.log(`SDKConnect::unmount()`);

  try {
    instance.state.appStateListener?.remove();
  } catch (err) {
    // Ignore if already removed
  }

  for (const id in instance.state.connected) {
    instance.state.connected[id].disconnect({
      terminate: false,
      context: 'unmount',
    });
  }

  if (Device.isAndroid()) {
    if (instance.state.timeout)
      BackgroundTimer.clearInterval(instance.state.timeout);
  } else if (instance.state.timeout) clearTimeout(instance.state.timeout);

  if (instance.state.initTimeout) clearTimeout(instance.state.initTimeout);

  instance.state.timeout = undefined;
  instance.state.initTimeout = undefined;
  instance.state._initialized = false;
  instance.state.approvedHosts = {};
  instance.state.disabledHosts = {};
  instance.state.connections = {};
  instance.state.connected = {};
  instance.state.connecting = {};
}

export default unmount;
