import { DappMetadata } from './dapp-metadata';
import { SDKMetadata } from './sdk-metadata';

/**
 * Metadata about the dApp and SDK that is requesting the connection.
 */
export interface Metadata {
  dapp: DappMetadata;
  sdk: SDKMetadata;
}
