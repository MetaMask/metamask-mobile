import { NativeEventEmitter, NativeModules } from 'react-native';

import { EventType } from '@metamask/sdk-communication-layer';

class AndroidSDKEventHandler extends NativeEventEmitter {
  constructor() {
    super(NativeModules.RCTDeviceEventEmitter);
  }

  onMessageReceived(callback) {
    return this.addListener(EventType.MESSAGE, (message) => {
      callback(message);
    });
  }

  onClientsConnected(callback) {
    return this.addListener(EventType.CLIENTS_CONNECTED, (id) => {
      callback(id);
    });
  }

  onClientsDisconnected(callback) {
    return this.addListener(EventType.CLIENTS_DISCONNECTED, (id) => {
      callback(id);
    });
  }
}

export default new AndroidSDKEventHandler();