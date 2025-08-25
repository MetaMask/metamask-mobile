import { DappMetadata } from './dapp-metadata';

export interface PersistedConnection {
  id: string;
  dappMetadata: DappMetadata;
}
