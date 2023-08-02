import { NativeEventEmitter, NativeModules } from 'react-native';

import { EventType } from '@metamask/sdk-communication-layer';

class AndroidSDKEventHandler extends NativeEventEmitter {
  constructor() {
    super(NativeModules.RCTDeviceEventEmitter);
  }

  onMessageReceived(callback: (message: string) => void) {
    return this.addListener(EventType.MESSAGE, (message) => {
      callback(message);
    });
  }

  onClientsConnected(callback: (clientInfo: string) => void) {
    return this.addListener(EventType.CLIENTS_CONNECTED, (clientInfo) => {
      callback(clientInfo);
    });
  }

  onClientsDisconnected(callback: (id: string) => void) {
    return this.addListener(EventType.CLIENTS_DISCONNECTED, (id) => {
      callback(id);
    });
  }
}

export default new AndroidSDKEventHandler();