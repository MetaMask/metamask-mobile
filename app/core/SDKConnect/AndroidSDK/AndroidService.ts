/* eslint-disable padding-line-between-statements */
import { EventEmitter2 } from 'eventemitter2';
import { NativeModules } from 'react-native';

import {
  CommunicationLayerMessage,
  DisconnectOptions,
  EventType,
  KeyInfo,
} from '@metamask/sdk-communication-layer';

import NativeSDKEventHandler from './NativeSDKEventHandler';
import { CommunicationLayer } from '@metamask/sdk-communication-layer/dist/browser/es/src/types/CommunicationLayer';
import { Channel } from '@metamask/sdk-communication-layer/dist/browser/es/src/types/Channel';
import { ConnectToChannelOptions } from '@metamask/sdk-communication-layer/dist/browser/es/src/types/ConnectToChannelOptions';

// eslint-disable-next-line import/prefer-default-export
export class AndroidService
  extends EventEmitter2
  implements CommunicationLayer
{
  private communicationClient = NativeModules.CommunicationClient;

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    NativeSDKEventHandler.onMessageReceived((message: string) => {
      const messageReceived = JSON.parse(message);
      console.log(messageReceived);
      this.emit(EventType.MESSAGE, { message: messageReceived });
    });

    NativeSDKEventHandler.onClientsConnected(() => {
        console.log(EventType.CLIENTS_CONNECTED);
      this.emit(EventType.CLIENTS_CONNECTED);
    });

    NativeSDKEventHandler.onClientsDisconnected(() => {
        console.log(EventType.CLIENTS_DISCONNECTED);
      this.emit(EventType.CLIENTS_DISCONNECTED);
    });
  }

  createChannel(): Channel {
    return {
      channelId: '',
      pubKey: '',
    };
  }

  sendMessage(message: CommunicationLayerMessage) {
    console.log(JSON.stringify(message));
    this.communicationClient.sendMessage(JSON.stringify(message));
  }

  getKeyInfo(): KeyInfo {
    return {
      step: '',
      ecies: {
        public: '',
        private: '',
      },
      keysExchanged: true,
    };
  }

  isConnected(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  connectToChannel(_options: ConnectToChannelOptions): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  pause(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resetKeys(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ping(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  keyCheck(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resume(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(_options?: DisconnectOptions | undefined): void {}
}