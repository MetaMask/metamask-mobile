import { MessageType } from './MessageType';
import { OriginatorInfo } from './OriginatorInfo';

export interface RemoteMessage {
  type: MessageType;
  originatorInfo?: OriginatorInfo;
}
