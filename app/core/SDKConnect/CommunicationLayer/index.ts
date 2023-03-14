import { ECIES, ECIESProps } from './ECIES';
import {
  RemoteCommunication,
  RemoteCommunicationProps,
} from './RemoteCommunication';
import { SocketService } from './SocketService';
import { CommunicationLayerPreference } from './types/CommunicationLayerPreference';
import { MessageType } from './types/MessageType';
import { WebRTCLib } from './types/WebRTCLib';
import { DappMetadata } from './types/DappMetadata';
import { CommunicationLayerMessage } from './types/CommunicationLayerMessage';
import { OriginatorInfo } from './types/OriginatorInfo';
import { WalletInfo } from './types/WalletInfo';
import { ConnectionStatus } from './types/ConnectionStatus';
import { ChannelConfig } from './types/ChannelConfig';
import { KeyInfo } from './types/KeyInfo';
import { DisconnectOptions } from './types/DisconnectOptions';
import { StorageManagerProps, StorageManager } from './types/StorageManager';
import { AutoConnectType } from './types/AutoConnectType';
import { AutoConnectOptions } from './types/AutoConnectOptions';
import { ServiceStatus } from './types/ServiceStatus';
import { CommunicationLayerLoggingOptions } from './types/LoggingOptions';
import { EventType } from './types/EventType';

export type {
  WebRTCLib,
  KeyInfo,
  StorageManager,
  AutoConnectOptions,
  RemoteCommunicationProps,
  WalletInfo,
  DappMetadata,
  ChannelConfig,
  CommunicationLayerMessage,
  OriginatorInfo,
  ECIESProps,
  ServiceStatus,
  CommunicationLayerLoggingOptions,
  DisconnectOptions,
  StorageManagerProps,
};

export {
  RemoteCommunication,
  ConnectionStatus,
  EventType,
  AutoConnectType,
  SocketService,
  ECIES,
  MessageType,
  CommunicationLayerPreference,
};
