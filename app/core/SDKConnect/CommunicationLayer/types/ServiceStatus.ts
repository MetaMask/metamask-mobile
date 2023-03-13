import { ChannelConfig } from './ChannelConfig';
import { ConnectionStatus } from './ConnectionStatus';
import { KeyInfo } from './KeyInfo';
import { OriginatorInfo } from './OriginatorInfo';

export interface ServiceStatus {
  keyInfo?: KeyInfo;
  channelConfig?: ChannelConfig;
  channelId?: string;
  originatorInfo?: OriginatorInfo;
  connectionStatus?: ConnectionStatus;
}
