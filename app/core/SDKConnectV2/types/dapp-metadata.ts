import { SDK } from './sdk';

/**
 * Metadata about the connected dApp.
 */
export interface DappMetadata {
  name: string;
  url: string;
  icon?: string;
  sdk?: SDK;
}
