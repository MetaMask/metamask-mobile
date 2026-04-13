import { RemoteConnectionInfo } from './types/RemoteConnectionInfo';

export interface DappClient {
  originatorInfo: RemoteConnectionInfo;
  clientId: string;
  connected: boolean;
  validUntil?: number;
  scheme?: string;
}

export interface DappConnections {
  [clientId: string]: DappClient;
}
