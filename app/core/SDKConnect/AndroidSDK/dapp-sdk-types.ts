import { OriginatorInfo } from '@metamask/sdk-communication-layer';

export interface DappClient {
  originatorInfo: OriginatorInfo;
  clientId: string;
  connected: boolean;
  validUntil?: number;
  scheme?: string;
}

export interface DappConnections {
  [clientId: string]: DappClient;
}
