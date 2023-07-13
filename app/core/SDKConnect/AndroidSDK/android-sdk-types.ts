import { OriginatorInfo } from '@metamask/sdk-communication-layer'

export interface AndroidClient {
    originatorInfo: OriginatorInfo;
    clientId: string;
  }